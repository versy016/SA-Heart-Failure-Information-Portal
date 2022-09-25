﻿angular.module("uMarketingSuite").service("umsUtilService", [
    "editorState",
    "contentResource",
    "$rootScope",
    "fileManager",
    "$q",
    "umsContentTypeService",
    "umsDomUtils",
    "eventsService",
    umsUtilService
]);

function umsUtilService(editorState, contentResource, $rootScope, fileManager, $q, umsContentTypeService, domUtils, eventsService) {
    /**
     * @returns {string} The current culture
     * */
    function getCurrentCulture() {
        var es = editorState.current;

        if (es == null || !Array.isArray(es.variants)) {
            return null;
        }

        function invariantToNull(culture) {
            // Umbraco uses the name "invariant" as the culture value
            // sometimes. However, in the back-end invariant is null so we also want null.
            if (culture === "invariant") {
                return null;
            } else {
                return culture;
            }
        }

        function getVariantCulture(variant) {
            if (variant != null && variant.language != null) {
                return invariantToNull(variant.language.culture);
            } else {
                // Invariant
                return null;
            }
        }

        var activeVariant = _.find(es.variants, function (variant) {
            return variant.active;
        });

        if (activeVariant != null) {
            return getVariantCulture(activeVariant);
        } else if (es.variants.length === 1) {
            // If only a single variant is there (active or not), 
            // its culture will be returned.
            return getVariantCulture(es.variants[0]);
        }

        // Invariant / unknown
        return null;
    }

    /**
     * @returns {number} The current content id
     * */
    function getCurrentContentId() {
        var es = editorState.current;
        if (es != null) {
            return es.id;
        } else {
            return null;
        }
    }

    /**
     * @returns {number} The current content type id
     * */
    function getCurrentContentTypeId() {
        var es = editorState.current;
        if (es != null) {
            return es.contentTypeId;
        } else {
            return null;
        }
    }

    /**
     * @returns {string} The URL of the currently active variant
     **/
    function getCurrentUrl() {
        var culture = getCurrentCulture();

        var es = editorState.current;
        if (es == null || es.urls == null || es.urls.length === 0) {
            return null;
        }

        var url = _.find(es.urls, function (url) { return (culture == null || url.culture === culture) && url.isUrl != false; });

        return url != null ? url.text : null;
    }

    function createEventEmitter() {
        // name -> [callbacks]
        var callbackMap = {};

        // name -> last emitted value
        var valueMap = {}

        /**
         * Subscribes to to the given event.
         * To unsubscribe, call the returned function.
         * @param {string} name Event name
         * @param {function} callback Callback function for event
         * @param {boolean} getValueOnSubscribe If true, calls the callback on subscribe with the last known value of the event
         * @returns {function} Unsubscribe function
         */
        function on(name, callback, getValueOnSubscribe) {
            if (typeof callback !== "function") {
                throw new Error("'callback' should be a function");
            }

            var callbacks = callbackMap[name] || (callbackMap[name] = []);

            callbacks.push(callback);

            var lastValue = valueMap[name];
            if (getValueOnSubscribe && lastValue) {
                // Currently the lastValue is the argument array, i.e. technically multiple values.
                // We will probably simplify this in the future as almost every event emitter implementation
                // out there just supports a single value.
                callback.apply(null, lastValue);
            }

            return function unsubscribe() {
                var idx = callbacks.indexOf(callback);
                if (idx !== -1) {
                    callbacks.splice(idx, 1);

                    if (callbacks.length === 0) {
                        delete callbackMap[name];
                    }
                }
            };
        }

        /**
         * Subscribes to a single occurrence of the given event.
         * No unsubscribe is needed, as it is performed automatically.
         * @param {any} name Event name
         * @param {any} callback Callback function for event
         * @returns Unsubscribe function. Can be used to cancel the initial callback. 
         * It is not necessary to unsubscribe after the callback is called.
         */
        function once(name, callback) {
            var unsubscribe;
            unsubscribe = on(name, function onceCallback(args) {
                callback(args);
                setTimeout(unsubscribe);
            });
            return unsubscribe;
        }

        /**
         * Subscribes to all events present in the callback object and registers the provided callback functions.
         * The returning function can be used to unsubscribe from all events at once.
         * @param {any} callbackObject Object containing keys mapped to callback functions, where each key is an event name.
         * @returns Unsubscribe function
         */
        function onAll(callbackObject) {
            var unsubscribeFns = [];

            for (var name in callbackObject) {
                if (!callbackObject.hasOwnProperty(name)) {
                    continue;
                }

                var callback = callbackObject[name];
                unsubscribeFns.push(on(name, callback));
            }

            return function unsubscribeAll() {
                for (var i = 0; i < unsubscribeFns.length; i++) {
                    unsubscribeFns[i]();
                }
            }
        }

        function emit() {
            var name = arguments[0];
            var params = [].slice.call(arguments, 1);

            var callbacks = callbackMap[name];

            if (callbacks != null) {
                for (var i = 0; i < callbacks.length; i++) {
                    var callback = callbacks[i];
                    if (callback != null) {
                        callback.apply(null, params);
                    }
                }

                // Make sure Angular picks up the changes
                // Similar to their implementation in $timeout():
                // https://github.com/angular/angular.js/blob/master/src/ng/timeout.js#L65
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
            }

            // Store all parameters.
            valueMap[name] = params;
        }

        /**
         * Emits an event that can be canceled by a subscriber.
         * This will emit the event with the given name and parameters but adds
         * a "cancel" property to the parameters object. 
         * This method will return true if any subscriber called this method,
         * otherwise false.
         * @param {string} name Event name
         * @param {object=} params Parameters, when supplied it must be an object.
         * @returns {boolean} true if the event should be canceled
         */
        function emitCancelable(name, params) {
            var cancel = false;
            var cancelArgs = { cancel: function () { cancel = true; } };
            var args = Object.assign(params || {}, cancelArgs);
            emit(name, args);
            return cancel;
        }

        return {
            on: on,
            once: once,
            onAll: onAll,
            emit: emit,
            emitCancelable: emitCancelable,
        };
    }

    function getPageName(nodeId, culture) {
        return contentResource.getById(nodeId).then(function (content) {
            if (content == null) {
                return null;
            }

            // Get variant matching current culture
            var variant = content.variants.length === 1 ? content.variants[0] : _.find(content.variants, function (v) {
                if (!culture) {
                    return v.isDefault || (v.language == null && v.segment == null);
                } else {
                    return v.language != null && v.language.culture === culture;
                }
            });

            if (variant == null) {
                return null;
            }

            return variant.name;
        });
    }

    function activateApp(alias) {
        var apps = editorState.current.apps;

        var toActivate = _.find(apps, function (app) {
            return app.alias === alias;
        });

        if (toActivate != null && !toActivate.active) {
            _.each(apps, function (app) {
                app.active = false;
            });

            toActivate.active = true;

            $rootScope.$broadcast("editors.apps.appChanged", { app: toActivate });
        }
    }

    function isContentAppActive(alias) {
        var apps = editorState.current.apps;
        var app = _.find(apps, function (app) {
            return app.alias === alias;
        });
        return app != null && app.active;
    }

    function getContentAppContainerForElement($element) {
        return $($element).closest(".umb-editor-sub-view__content")[0];
    }

    function contentAppOnActivate(element, onActivate, invokeOnCall) {
        var contentApp = getContentAppContainerForElement(element);
        if (contentApp == null) {
            throw new Error("contentAppOnActivate: No Content App found for element!");
        }

        if (invokeOnCall) {
            var isActive = !contentApp.classList.contains("ng-hide");
            onActivate(isActive);
        }

        function classOnChange(classAdded) {
            // Callback from domUtils returns when the class is added,
            // but for a contentApp this is ng-hide which means the contentApp
            // is inactive. We want to return a boolean specifying if the contentApp
            // is active instead.
            var contentAppIsActive = !classAdded;
            return onActivate(contentAppIsActive);
        }

        return domUtils.onClassChange(contentApp, "ng-hide", classOnChange);
    }

    function saveOrPublishContent(variantSelector, publish, showNotifications) {
        var content = editorState.current;
        var variants = content.variants;

        var saveOrPublishAny = false;

        _.each(variants, function (variant) {
            var variantCulture = variant.language && variant.language.culture;
            var variantSegment = variant.segment;

            var saveOrPublish = variantSelector({
                variant: variant,
                culture: variantCulture,
                segment: variantSegment,
            });

            if (saveOrPublish) {
                saveOrPublishAny = true;
            }

            variant.save = saveOrPublish;
            variant.publish = publish && saveOrPublish;
        });

        var saveFn = publish ? contentResource.publish : contentResource.save;

        if (!saveOrPublishAny) {
            return $q.when();
        } else {
            return saveFn.call(contentResource, content, false, fileManager.getFiles(), showNotifications);
        }
    }

    function saveContent(variantSelector, showValidationNotification) {
        return saveOrPublishContent(variantSelector, false, !!showValidationNotification);
    }

    function publishContent(variantSelector, showValidationNotification) {
        return saveOrPublishContent(variantSelector, true, !!showValidationNotification);
    }

    /**
     * Merges the two given objects, overwriting all properties of `dst` with the properties of `src`.
     * This does not do a deep merge exactly, it simply overwrites all the top-level properties
     * of `dst` with the top-level properties of `src`.
     * This is done to not change the reference of `dst` itself, but update all references 
     * inside `dst`.
     * @param {any} dst Destination object
     * @param {any} src Source object
     */
    function merge(dst, src) {
        for (var key in src) {
            if (!src.hasOwnProperty(key)) {
                continue;
            }

            dst[key] = src[key];
        }
    }

    /**
     * Specifies if the content type allows segmentation of at least 1 property
     * @param {number} contentTypeId Id of content type
     * @returns {boolean} True if content type has at least 1 segmented property
     */
    function hasSegmentedProperty(contentTypeId) {
        return umsContentTypeService.hasSegmentedProperty(contentTypeId);
    }

    function reloadNode(callback) {
        // Callback will be called when the node was successfully reloaded,
        // which is either on content.newReady (new nodde) or content.loaded (existing node)
        if (typeof callback === "function") {
            var events = ["content.newReady", "content.loaded"];
            var unsubscribeFns = [];

            function onReload() {
                callback();
                unsubscribeFns.forEach(function (unsubscribeFn) {
                    unsubscribeFn();
                });
            }

            unsubscribeFns = events.map(function (event) {
                return eventsService.on(event, onReload);
            });
        }

        eventsService.emit("editors.content.reload", { node: { id: editorState.current.id } });
    }

    // Public API
    this.getCurrentCulture = getCurrentCulture;
    this.getCurrentContentId = getCurrentContentId;
    this.getCurrentContentTypeId = getCurrentContentTypeId;
    this.getCurrentUrl = getCurrentUrl;
    this.createEventEmitter = createEventEmitter;
    this.getPageName = getPageName;
    this.activateApp = activateApp;
    this.contentAppOnActivate = contentAppOnActivate;
    this.isContentAppActive = isContentAppActive;
    this.saveContent = saveContent;
    this.publishContent = publishContent;
    this.merge = merge;
    this.hasSegmentedProperty = hasSegmentedProperty;
    this.reloadNode = reloadNode;
}

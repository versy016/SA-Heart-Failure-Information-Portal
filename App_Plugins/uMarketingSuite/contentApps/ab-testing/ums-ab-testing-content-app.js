angular.module("uMarketingSuite").component("umsAbTestingContentApp", {
    require: {
        variantsCtrl: "^umbVariantContentEditors",
    },
    templateUrl: "/App_Plugins/uMarketingSuite/contentApps/ab-testing/ums-ab-testing-content-app.html",
    controller: [
        "umsUtilService",
        "umsAbTestingService",
        "umsAbTestingCreateTestState",
        "umsAbTestingCreateTestService",
        "umsEventEmitter",
        "umsState",
        "$element",
        "$q",
        "$scope",
        "editorState",
        function umsAbTestContentAppController(utils, service, createTestState, createTestService, eventEmitter, umsState, $element, $q, $scope, editorState) {
            var ctrl = this;

            var destroyFns = [];

            var state = ctrl.state = {
                contentId: null,
                culture: null,
                loaded: null,

                // One of 'main' / 'create' / 'detail'
                view: "main",

                // Test that is being created
                createState: createTestState,

                // Tests that have been created for this page
                testsForPage: [],

                testDetail: {
                    id: null,
                    draft: false,
                },

                segmentSupport: umsState.segmentSupport,

                // Controlled by ums-ab-testing-test-filters
                filters: {},
            }

            this.$onInit = function () {
                if (createTestState.test != null) {
                    state.view = 'create';
                }

                destroyFns.push(
                    eventEmitter.on("ab-testing.content-app.show-test", function (args) {
                        if (args.id != null && args.id !== state.testDetail.id) {
                            fn.loadTest(args.id).then(function (test) {
                                if (test != null) {
                                    fn.openTest(test.id, test.status);
                                }
                            });
                        }
                    })
                );

                destroyFns.push(
                    utils.contentAppOnActivate($element, function (isActive) {
                        ctrl.enabled = isActive;
                    }, true)
                );

                var caModel = $scope.$parent.$parent.model;
                if (caModel != null && caModel.viewModel != null) {
                    var es = editorState.current;
                    var appIdx = _.findIndex(es.apps, function (app) {
                        return app.alias === caModel.alias;
                    });

                    if (appIdx > -1) {
                        var appTab = document.querySelector("ul.umb-sub-views-nav > li:nth-child(" + (appIdx + 1) + ") umb-editor-navigation-item > button");
                        if (appTab != null) {
                            var badgeElem = document.createElement("div");
                            
                            if (caModel.viewModel.abTestRunning) {                                
                                badgeElem.classList.add("badge", "ums-ca-badge__item");
                                badgeElem.innerHTML = '<svg class="ums-ca-badge__icon" data-ums-icon-id="ums-badge-icon-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9.01 10">\
                                <path d="M9.739.22c-.9-.517-1.632-.093-1.632.945V8.833c0,1.04.731,1.463,1.632.946l6.7-3.843a.986.986,0,0,0,0-1.873Z" transform="translate(-8.107)"/>\
                                </svg>';
                            } else if (caModel.viewModel.abTestScheduled) {
                                badgeElem.classList.add("badge", "ums-ca-badge__item", "s-scheduled");
                                badgeElem.innerHTML = '<svg class="ums-ca-badge__icon" data-ums-icon-id="ums-badge-icon-clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 559.98 559.98">\
                                    <path d="M279.99,0C125.601,0,0,125.601,0,279.99c0,154.39,125.601,279.99,279.99,279.99c154.39,0,279.99-125.601,279.99-279.99C559.98,125.601,434.38,0,279.99,0z M279.99,498.78c-120.644,0-218.79-98.146-218.79-218.79c0-120.638,98.146-218.79,218.79-218.79s218.79,98.152,218.79,218.79C498.78,400.634,400.634,498.78,279.99,498.78z"/>\
                                    <path d="M304.226,280.326V162.976c0-13.103-10.618-23.721-23.716-23.721c-13.102,0-23.721,10.618-23.721,23.721v124.928c0,0.373,0.092,0.723,0.11,1.096c-0.312,6.45,1.91,12.999,6.836,17.926l88.343,88.336c9.266,9.266,24.284,9.266,33.543,0c9.26-9.266,9.266-24.284,0-33.544L304.226,280.326z"/>\
                                </svg>';
                            }

                            appTab.appendChild(badgeElem);
                        }
                    }
                }
            }

            this.$onDestroy = function () {
                destroyFns.forEach(function (fn) { fn() });
            }

            var fn = ctrl.fn = {
                load: function () {
                    state.loaded = false;
                    state.contentId = utils.getCurrentContentId();
                    state.culture = utils.getCurrentCulture();
                    fn.refreshTestsForPage().then(function () {
                        state.loaded = true;
                    });

                },

                refreshTestsForPage: function () {
                    if (state.contentId === 0) {
                        state.testsForPage = [];
                        return $q.when();
                    }

                    return service.getAllForPage(state.contentId).then(function (response) {
                        state.testsForPage = response.data;
                    });

                },

                loadTest: function (id) {
                    return service.getTestDetails(id).then(function (response) {
                        return response.data;
                    });
                },

                openTest: function (id, status) {
                    state.testDetail.id = id;
                    state.testDetail.draft = status === 5;
                    state.view = 'detail';
                },

                onCreatedTest: function (test) {
                    fn.openTest(test.id, test.status);
                    fn.refreshTestsForPage();
                },

                clearTestCreateState: function () {
                    eventEmitter.emit("ab-testing.clear-create-state");
                },

                startTest: function () {
                    fn.clearTestCreateState();
                    state.view = 'create';
                },

                editVariant: function (test, variant, defaultFn) {
                    if (test.testType !== 0) {
                        // No Splitview: run default code
                        defaultFn();
                        return;
                    }

                    service.saveTest(test, false).then(function (response) {
                        var testId = response.data.id;

                        if (response.data.test != null) {
                            createTestState.test = response.data.test;
                        }

                        createTestState.test.id = testId;

                        if (variant.id == null || variant.id === 0) {
                            // First retrieve the saved test to obtain variant with its id
                            var variantIndex = test.variants.indexOf(variant);

                            // Check the current test -- could have the updated id
                            var newVariant = createTestState.test.variants[variantIndex];
                            if (newVariant != null && newVariant.id > 0) {
                                next(newVariant);
                            } else {
                                service.getTestDetails(testId).then(function (response) {
                                    // Retrieve saved variant including its id
                                    var variant = response.data.variants[variantIndex];
                                    next(variant);
                                });
                            }
                        } else {
                            // Variant id is already here -- just continue
                            next(variant);
                        }
                    });

                    function next(variant) {
                        var segmentExists = _.any(ctrl.variantsCtrl.content.variants, function (v) {
                            return (v.culture == null || v.culture === state.culture) && v.segment == variant.segment;
                        });

                        if (segmentExists) {
                            // Segment already existed, open splitview without reloading content
                            ctrl.fn.openInSplitview(state.culture, variant.segment);
                        } else {
                            // Create segment, then open it in splitview.
                            service.createSegment(state.contentId, state.culture, variant.segment).then(function () {
                                utils.reloadNode(function () {
                                    // Reload will destroy all components and reinitialize them.
                                    // setTimeout is used to wait for the component that will open our splitview
                                    // to have initialized again.
                                    setTimeout(function () {
                                        ctrl.fn.openInSplitview(state.culture, variant.segment);
                                    });
                                });
                            });
                        }
                    }
                },

                openInSplitview: function (culture, segment) {
                    eventEmitter.emit("open-splitview", { culture: culture, segment: segment });
                },

                previewVariant: createTestService.fn.previewVariant,

                filterTests: function (test) {
                    var test = test || {};
                    if (!state.filters.waiting && (test.status === 1 || test.status === 5)) return false;
                    if (!state.filters.running && test.status === 2) return false;
                    if (!state.filters.completed && (test.status === 3 || test.status === 4)) return false;

                    if (!(state.filters.reliable && test.reliableVariants > 0 || state.filters.unreliable && test.reliableVariants === 0)) {
                        return false;
                    }

                    if (state.filters.userId && test.createdByUmbracoUserId != state.filters.userId) return false;

                    return true;
                },
                filterScheduledOrDraft: function (test) {
                    return test && (test.status === 1 || test.status === 5);
                },
            }
        }
    ],
});

angular.module("uMarketingSuite").controller("umsAnalyticsContentAppCtrl", [
    "umsUtilService",
    "$element",
    "$scope",
    umsAnalyticsContentAppCtrl
]);

function umsAnalyticsContentAppCtrl(utils, $element, $scope) {
    var $ctrl = this;

    // Bottom bar of Umbraco which holds buttons like Save & Publish
    this.bottomBar = null;
    // Container which has a bottom position set of some amount of pixels
    this.editorContainer = null;

    this.load = function() {
        this.contentId = utils.getCurrentContentId();
        this.culture = utils.getCurrentCulture();
        this.bottomBar = document.querySelector(".umb-editor-footer");
        this.editorContainer = document.querySelector(".umb-editor-container");

        if (this.bottomBar != null && this.editorContainer != null) {
            var unsubscribe = utils.contentAppOnActivate($element, function(isActive) {
                if (isActive) $ctrl.hideBottomBar();
                else $ctrl.restoreBottomBar();
            }, true)

            $scope.$on("$destroy", unsubscribe);
            $scope.$on("$destroy", this.restoreBottomBar.bind(this));
        }

        this.loaded = true;
    }

    this.hideBottomBar = function hideBottomBar() {
        $ctrl.bottomBar.style.display = "none";
        $ctrl.editorContainer.style.bottom = 0;
    }

    this.restoreBottomBar = function restoreBottomBar() {
        $ctrl.bottomBar.style.removeProperty("display");
        $ctrl.editorContainer.style.removeProperty("bottom");
    }
}

/**
 * ng-csv module
 * Export Javascript's arrays to csv files from the browser
 *
 * Author: asafdav - https://github.com/asafdav
 */
angular.module("ngCsv.directives").directive("ngCsv", [
    "ToastUtil",
    "$log",
    "$parse",
    "$q",
    "CSV",
    "$document",
    "$timeout",
    function (ToastUtil, $log, $parse, $q, CSV, $document, $timeout) {
        let dataIsFalse = false;

        return {
            restrict: "AC",
            scope: {
                data: "&ngCsv",
                filename: "@filename",
                header: "&csvHeader",
                columnOrder: "&csvColumnOrder",
                txtDelim: "@textDelimiter",
                decimalSep: "@decimalSeparator",
                quoteStrings: "@quoteStrings",
                fieldSep: "@fieldSeparator",
                lazyLoad: "@lazyLoad",
                addByteOrderMarker: "@addBom",
                ngClick: "&",
                charset: "@charset",
                label: "&csvLabel",
            },
            controller: [
                "$scope",
                "$element",
                "$attrs",
                "$transclude",
                function ($scope, $element, $attrs, $transclude) {
                    $scope.csv = "";

                    if (
                        !angular.isDefined($scope.lazyLoad) ||
                        $scope.lazyLoad != "true"
                    ) {
                        if (angular.isArray($scope.data)) {
                            $scope.$watch(
                                "data",
                                function (newValue) {
                                    $scope.buildCSV();
                                },
                                true
                            );
                        }
                    }

                    $scope.getFilename = function () {
                        return $scope.filename || "download.csv";
                    };

                    function getBuildCsvOptions() {
                        var options = {
                            txtDelim: $scope.txtDelim ? $scope.txtDelim : '"',
                            decimalSep: $scope.decimalSep
                                ? $scope.decimalSep
                                : ".",
                            quoteStrings: $scope.quoteStrings,
                            addByteOrderMarker: $scope.addByteOrderMarker,
                        };
                        if (angular.isDefined($attrs.csvHeader))
                            options.header = $scope.$eval($scope.header);
                        if (angular.isDefined($attrs.csvColumnOrder))
                            options.columnOrder = $scope.$eval(
                                $scope.columnOrder
                            );
                        if (angular.isDefined($attrs.csvLabel))
                            options.label = $scope.$eval($scope.label);

                        options.fieldSep = $scope.fieldSep
                            ? $scope.fieldSep
                            : ",";

                        // Replaces any badly formatted special character string with correct special character
                        options.fieldSep = CSV.isSpecialChar(options.fieldSep)
                            ? CSV.getSpecialChar(options.fieldSep)
                            : options.fieldSep;

                        return options;
                    }

                    /**
                     * Creates the CSV and updates the scope
                     * @returns {*}
                     */
                    $scope.buildCSV = function () {
                        var deferred = $q.defer();
                        var data = null;

                        $element.addClass(
                            $attrs.ngCsvLoadingClass || "ng-csv-loading"
                        );

                        // $scope.data is a promise, invoke it to create an unresolved promise
                        data = $scope.data();

                        if (angular.isFunction(data)) {
                            data = data();
                        }

                        CSV.stringify(data, getBuildCsvOptions()).then(
                            function (csv) {
                                if (csv === false) {
                                    $log.debug(
                                        "Data was returned to ng-csv directive as a strict false value - skipping export."
                                    );
                                    dataIsFalse = true;
                                }

                                $scope.csv = csv;
                                $element.removeClass(
                                    $attrs.ngCsvLoadingClass || "ng-csv-loading"
                                );
                                deferred.resolve(csv);
                            }
                        );
                        $scope.$apply(); // Old angular support

                        return deferred.promise;
                    };
                },
            ],
            link: function (scope, element, attrs) {
                function doClick() {
                    var charset = scope.charset || "utf-8";
                    var blob = new Blob([scope.csv], {
                        type: "text/csv;charset=" + charset + ";",
                    });

                    if (window.navigator.msSaveOrOpenBlob) {
                        navigator.msSaveBlob(blob, scope.getFilename());
                    } else {
                        var downloadContainer = angular.element(
                            '<div data-tap-disabled="true"><a></a></div>'
                        );
                        var downloadLink = angular.element(
                            downloadContainer.children()[0]
                        );
                        downloadLink.attr(
                            "href",
                            window.URL.createObjectURL(blob)
                        );
                        downloadLink.attr("download", scope.getFilename());
                        downloadLink.attr("target", "_blank");

                        $document.find("body").append(downloadContainer);
                        $timeout(function () {
                            downloadLink[0].click();
                            downloadLink.remove();
                        }, null);
                    }
                }

                element.bind("click", function (e) {
                    scope.buildCSV().then(function (csv) {
                        // Check if csv is a non-empty array
                        if (!dataIsFalse) {
                            doClick();

                            ToastUtil.customSuccess(
                                "Data exported successfully"
                            );
                        } else {
                            ToastUtil.customError("No data to export");
                        }
                    });
                    scope.$apply();
                });
            },
        };
    },
]);

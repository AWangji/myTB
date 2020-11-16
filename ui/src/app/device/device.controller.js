/*
 * Copyright © 2016-2020 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 负责管理客户和客户用户对设备的管理权限
 */
/* eslint-disable import/no-unresolved, import/default */

import addDeviceTemplate from './add-device.tpl.html';
import deviceCard from './device-card.tpl.html';
import assignToCustomerTemplate from './assign-to-customer.tpl.html';//这部分是tenant中选择customer进行分配的部分
import addDevicesToCustomerTemplate from './add-devices-to-customer.tpl.html';//这个html对应的就是tenant选择设备进行分配的部分
import deviceCredentialsTemplate from './device-credentials.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

/*@ngInject*/
export function DeviceCardController(types) {

    var vm = this;

    vm.types = types;

    vm.isAssignedToCustomer = function() {
        if (vm.item && vm.item.customerId && vm.parentCtl.devicesScope === 'tenant' &&
            vm.item.customerId.id != vm.types.id.nullUid && !vm.item.assignedCustomer.isPublic) {
            return true;
        }
        return false;
    }

    vm.isPublic = function() {
        if (vm.item && vm.item.assignedCustomer && vm.parentCtl.devicesScope === 'tenant' && vm.item.assignedCustomer.isPublic) {
            return true;
        }
        return false;
    }
}


/*@ngInject*/
export function DeviceController($rootScope, userService, deviceService, customerService, $state, $stateParams,
                                 $document, $mdDialog, $q, $translate, types, importExport) {

    var customerId = $stateParams.customerId;

    var deviceActionsList = [];

    var deviceGroupActionsList = [];

    var deviceAddItemActionsList = [
        {
            onAction: function ($event) {
                vm.grid.addItem($event);
            },
            name: function() { return $translate.instant('action.add') },
            details: function() { return $translate.instant('device.add-device-text') },
            icon: "insert_drive_file"
        },
        {
            onAction: function ($event) {
                importExport.importEntities($event, types.entityType.device).then(
                    function() {
                        vm.grid.refreshList();
                    }
                );
            },
            name: function() { return $translate.instant('action.import') },
            details: function() { return $translate.instant('device.import') },
            icon: "file_upload"
        }
    ];

    var vm = this;

    vm.types = types;

    vm.deviceGridConfig = {
        deleteItemTitleFunc: deleteDeviceTitle,
        deleteItemContentFunc: deleteDeviceText,
        deleteItemsTitleFunc: deleteDevicesTitle,
        deleteItemsActionTitleFunc: deleteDevicesActionTitle,
        deleteItemsContentFunc: deleteDevicesText,

        saveItemFunc: saveDevice,

        getItemTitleFunc: getDeviceTitle,

        itemCardController: 'DeviceCardController',
        itemCardTemplateUrl: deviceCard,
        parentCtl: vm,

        actionsList: deviceActionsList,
        groupActionsList: deviceGroupActionsList,
        addItemActions: deviceAddItemActionsList,

        onGridInited: gridInited,

        addItemTemplateUrl: addDeviceTemplate,

        noItemsText: function() { return $translate.instant('device.no-devices-text') },
        itemDetailsText: function() { return $translate.instant('device.device-details') },
        isDetailsReadOnly: isCustomerUser,
        isSelectionEnabled: function () {
            return !isCustomerUser();
        }
    };

    if (angular.isDefined($stateParams.items) && $stateParams.items !== null) {
        vm.deviceGridConfig.items = $stateParams.items;
    }

    if (angular.isDefined($stateParams.topIndex) && $stateParams.topIndex > 0) {
        vm.deviceGridConfig.topIndex = $stateParams.topIndex;
    }

    vm.devicesScope = $state.$current.data.devicesType;

    vm.assignToCustomer = assignToCustomer;
    vm.makePublic = makePublic;
    vm.unassignFromCustomer = unassignFromCustomer;
    vm.manageCredentials = manageCredentials;

    initController();

    function initController() {
        var fetchDevicesFunction = null;
        var deleteDeviceFunction = null;
        var refreshDevicesParamsFunction = null;

        var user = userService.getCurrentUser();

        if (user.authority === 'CUSTOMER_USER') {
            vm.devicesScope = 'customer_user';
            customerId = user.customerId;
        }
        if (customerId) {
            vm.customerDevicesTitle = $translate.instant('customer.devices');
            customerService.getShortCustomerInfo(customerId).then(
                function success(info) {
                    if (info.isPublic) {
                        vm.customerDevicesTitle = $translate.instant('customer.public-devices');
                    }
                }
            );
        }

        if (vm.devicesScope === 'tenant') {
            fetchDevicesFunction = function (pageLink, deviceType) {
                return deviceService.getTenantDevices(pageLink, true, null, deviceType);
            };
            deleteDeviceFunction = function (deviceId) {
                return deviceService.deleteDevice(deviceId);
            };
            refreshDevicesParamsFunction = function() {
                return {"topIndex": vm.topIndex};
            };

            deviceActionsList.push({
                onAction: function ($event, item) {
                    makePublic($event, item);
                },
                name: function() { return $translate.instant('action.share') },
                details: function() { return $translate.instant('device.make-public') },
                icon: "share",
                isEnabled: function(device) {
                    return device && (!device.customerId || device.customerId.id === types.id.nullUid);
                }
            });

            deviceActionsList.push(
                {
                    onAction: function ($event, item) {
                        assignToCustomer($event, [ item.id.id ]);
                    },
                    name: function() { return $translate.instant('action.assign') },
                    details: function() { return $translate.instant('device.assign-to-customer') },
                    icon: "assignment_ind",
                    isEnabled: function(device) {
                        return device && (!device.customerId || device.customerId.id === types.id.nullUid);
                    }
                }
            );

            deviceActionsList.push(
                {
                    onAction: function ($event, item) {
                        unassignFromCustomer($event, item, false);
                    },
                    name: function() { return $translate.instant('action.unassign') },
                    details: function() { return $translate.instant('device.unassign-from-customer') },
                    icon: "assignment_return",
                    isEnabled: function(device) {
                        return device && device.customerId && device.customerId.id !== types.id.nullUid && !device.assignedCustomer.isPublic;
                    }
                }
            );

            deviceActionsList.push({
                onAction: function ($event, item) {
                    unassignFromCustomer($event, item, true);
                },
                name: function() { return $translate.instant('action.make-private') },
                details: function() { return $translate.instant('device.make-private') },
                icon: "reply",
                isEnabled: function(device) {
                    return device && device.customerId && device.customerId.id !== types.id.nullUid && device.assignedCustomer.isPublic;
                }
            });

            deviceActionsList.push(
                {
                    onAction: function ($event, item) {
                        manageCredentials($event, item);
                    },
                    name: function() { return $translate.instant('device.credentials') },
                    details: function() { return $translate.instant('device.manage-credentials') },
                    icon: "security"
                }
            );

            deviceActionsList.push(
                {
                    onAction: function ($event, item) {
                        vm.grid.deleteItem($event, item);
                    },
                    name: function() { return $translate.instant('action.delete') },
                    details: function() { return $translate.instant('device.delete') },
                    icon: "delete"
                }
            );

            deviceGroupActionsList.push(
                {
                    onAction: function ($event, items) {
                        assignDevicesToCustomer($event, items);
                    },
                    name: function() { return $translate.instant('device.assign-devices') },
                    details: function(selectedCount) {
                        return $translate.instant('device.assign-devices-text', {count: selectedCount}, "messageformat");
                    },
                    icon: "assignment_ind"
                }
            );

            deviceGroupActionsList.push(
                {
                    onAction: function ($event) {
                        vm.grid.deleteItems($event);
                    },
                    name: function() { return $translate.instant('device.delete-devices') },
                    details: deleteDevicesActionTitle,
                    icon: "delete"
                }
            );



        } else if (vm.devicesScope === 'customer' || vm.devicesScope === 'customer_user') {
            fetchDevicesFunction = function (pageLink, deviceType) {
                return deviceService.getCustomerDevices(customerId, pageLink, true, null, deviceType);//
            };
            deleteDeviceFunction = function (deviceId) {
                return deviceService.unassignDeviceFromCustomer(deviceId);
            };
            refreshDevicesParamsFunction = function () {
                return {"customerId": customerId, "topIndex": vm.topIndex};
            };

            if (vm.devicesScope === 'customer') {//原本只有customer，这句应该才是从home里面进入customer进入设备管理的权限，在add那里会调用函数并调用api:tenant/devices
                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            unassignFromCustomer($event, item, false);
                        },
                        name: function() { return $translate.instant('action.unassign') },
                        details: function() { return $translate.instant('device.unassign-from-customer') },
                        icon: "assignment_return",
                        isEnabled: function(device) {
                            return device && !device.assignedCustomer.isPublic;
                        }
                    }
                );
                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            unassignFromCustomer($event, item, true);
                        },
                        name: function() { return $translate.instant('action.make-private') },
                        details: function() { return $translate.instant('device.make-private') },
                        icon: "reply",
                        isEnabled: function(device) {
                            return device && device.assignedCustomer.isPublic;
                        }
                    }
                );

                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            manageCredentials($event, item);
                        },
                        name: function() { return $translate.instant('device.credentials') },
                        details: function() { return $translate.instant('device.manage-credentials') },
                        icon: "security"
                    }
                );

                deviceGroupActionsList.push(
                    {
                        onAction: function ($event, items) {
                            unassignDevicesFromCustomer($event, items);
                        },
                        name: function() { return $translate.instant('device.unassign-devices') },
                        details: function(selectedCount) {
                            return $translate.instant('device.unassign-devices-action-title', {count: selectedCount}, "messageformat");
                        },
                        icon: "assignment_return"
                    }
                );

                vm.deviceGridConfig.addItemAction = {
                    onAction: function ($event) {
                        addDevicesToCustomer($event);//tenant下的客户设备管理下的加号，用于选择设备进行分配给当前客户
                    },
                    name: function() { return $translate.instant('device.assign-devices') },
                    details: function() { return $translate.instant('device.assign-new-device') },
                    icon: "add"     //红色的加号
                };

            } else if (vm.devicesScope === 'customer_user') {
                /*deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            manageCredentials($event, item);
                        },
                        name: function() { return $translate.instant('device.credentials') },
                        details: function() { return $translate.instant('device.view-credentials') },
                        icon: "security"
                    }
                );*/
                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            unassignFromCustomer($event, item, false);
                        },
                        name: function() { return $translate.instant('action.unassign') },
                        details: function() { return $translate.instant('device.unassign-from-customer') },
                        icon: "assignment_return",
                        isEnabled: function(device) {
                            return device && !device.assignedCustomer.isPublic;
                        }
                    }
                );
                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            unassignFromCustomer($event, item, true);
                        },
                        name: function() { return $translate.instant('action.make-private') },
                        details: function() { return $translate.instant('device.make-private') },
                        icon: "reply",
                        isEnabled: function(device) {
                            return device && device.assignedCustomer.isPublic;
                        }
                    }
                );

                deviceActionsList.push(
                    {
                        onAction: function ($event, item) {
                            manageCredentials($event, item);
                        },
                        name: function() { return $translate.instant('device.credentials') },
                        details: function() { return $translate.instant('device.manage-credentials') },
                        icon: "security"
                    }
                );

                deviceGroupActionsList.push(
                    {
                        onAction: function ($event, items) {
                            unassignDevicesFromCustomer($event, items);
                        },
                        name: function() { return $translate.instant('device.unassign-devices') },
                        details: function(selectedCount) {
                            return $translate.instant('device.unassign-devices-action-title', {count: selectedCount}, "messageformat");
                        },
                        icon: "assignment_return"
                    }
                );

                vm.deviceGridConfig.addItemAction = {
                    onAction: function ($event) {
                        BindCustomeruserDevices($event);//自定义一个function，这个function会调用其他自定义的一个api，这个api不会一下显示所有的设备，而且搜索规则会按照deviceid
                    },
                    name: function() { return $translate.instant('device.assign-devices') },
                    details: function() { return $translate.instant('device.assign-new-device') },
                    icon: "add"     //红色的加号
                };
                vm.deviceGridConfig.addItemAction = {};
            }
            vm.deviceGridConfig.addItemActions = [];

        }

        vm.deviceGridConfig.refreshParamsFunc = refreshDevicesParamsFunction;
        vm.deviceGridConfig.fetchItemsFunc = fetchDevicesFunction;
        vm.deviceGridConfig.deleteItemFunc = deleteDeviceFunction;

    }

    function deleteDeviceTitle(device) {
        return $translate.instant('device.delete-device-title', {deviceName: device.name});
    }

    function deleteDeviceText() {
        return $translate.instant('device.delete-device-text');
    }

    function deleteDevicesTitle(selectedCount) {
        return $translate.instant('device.delete-devices-title', {count: selectedCount}, 'messageformat');
    }

    function deleteDevicesActionTitle(selectedCount) {
        return $translate.instant('device.delete-devices-action-title', {count: selectedCount}, 'messageformat');
    }

    function deleteDevicesText () {
        return $translate.instant('device.delete-devices-text');
    }

    function gridInited(grid) {
        vm.grid = grid;
    }

    function getDeviceTitle(device) {
        return device ? device.name : '';
    }

    function saveDevice(device) {
        var deferred = $q.defer();
        deviceService.saveDevice(device).then(
            function success(savedDevice) {
                $rootScope.$broadcast('deviceSaved');
                var devices = [ savedDevice ];
                customerService.applyAssignedCustomersInfo(devices).then(
                    function success(items) {
                        if (items && items.length == 1) {
                            deferred.resolve(items[0]);
                        } else {
                            deferred.reject();
                        }
                    },
                    function fail() {
                        deferred.reject();
                    }
                );
            },
            function fail() {
                deferred.reject();
            }
        );
        return deferred.promise;
    }

    function isCustomerUser() {
        return vm.devicesScope === 'customer_user';
    }

    function assignToCustomer($event, deviceIds) {
        if ($event) {
            $event.stopPropagation();
        }
        var pageSize = 10;
        customerService.getCustomers({limit: pageSize, textSearch: ''}).then(
            function success(_customers) {
                var customers = {
                    pageSize: pageSize,
                    data: _customers.data,
                    nextPageLink: _customers.nextPageLink,
                    selection: null,
                    hasNext: _customers.hasNext,
                    pending: false
                };
                if (customers.hasNext) {
                    customers.nextPageLink.limit = pageSize;
                }
                $mdDialog.show({
                    controller: 'AssignDeviceToCustomerController',
                    controllerAs: 'vm',
                    templateUrl: assignToCustomerTemplate,
                    locals: {deviceIds: deviceIds, customers: customers},
                    parent: angular.element($document[0].body),
                    fullscreen: true,
                    targetEvent: $event
                }).then(function () {
                    vm.grid.refreshList();
                }, function () {
                });
            },
            function fail() {
            });
    }

    function addDevicesToCustomer($event) {
        if ($event) {
            $event.stopPropagation();
        }
        var pageSize = 10;
        deviceService.getTenantDevices({limit: pageSize, textSearch: ''}, false).then(//这个地方原本的增加设备这个按钮一点击之后就会调用tenant查询所有设备的api，但我们不能这样
            function success(_devices) {
                var devices = {
                    pageSize: pageSize,
                    data: _devices.data,
                    nextPageLink: _devices.nextPageLink,
                    selections: {},
                    selectedCount: 0,
                    hasNext: _devices.hasNext,
                    pending: false
                };
                if (devices.hasNext) {
                    devices.nextPageLink.limit = pageSize;
                }
                $mdDialog.show({
                    controller: 'AddDevicesToCustomerController',
                    controllerAs: 'vm',
                    templateUrl: addDevicesToCustomerTemplate,
                    locals: {customerId: customerId, devices: devices},
                    parent: angular.element($document[0].body),
                    fullscreen: true,
                    targetEvent: $event
                }).then(function () {
                    vm.grid.refreshList();
                }, function () {
                });
            },
            function fail() {
            });
    }
        function BindCustomeruserDevices($event) {
            if ($event) {
                $event.stopPropagation();
            }
            var pageSize = 20;
            deviceService.getCustomeruserDevices({limit: pageSize, textSearch: ''}, false).then(//调用这个函数后，这个函数会调用到相应api里去
                function success(_devices) {
                    var devices = {
                        pageSize: pageSize,
                        data: _devices.data,
                        nextPageLink: _devices.nextPageLink,
                        selections: {},
                        selectedCount: 0,
                        hasNext: _devices.hasNext,
                        pending: false
                    };
                    if (devices.hasNext) {
                        devices.nextPageLink.limit = pageSize;
                    }
                    $mdDialog.show({
                        controller: 'AddDevicesToCustomerController',//先不动
                        controllerAs: 'vm',
                        templateUrl: addDevicesToCustomerTemplate,//先不动
                        locals: {customerId: customerId, devices: devices},
                        parent: angular.element($document[0].body),
                        fullscreen: true,
                        targetEvent: $event
                    }).then(function () {
                        vm.grid.refreshList();
                    }, function () {
                    });
                },
                function fail() {
                };
        }

    function assignDevicesToCustomer($event, items) {
        var deviceIds = [];
        for (var id in items.selections) {
            deviceIds.push(id);
        }
        assignToCustomer($event, deviceIds);
    }

    function unassignFromCustomer($event, device, isPublic) {
        if ($event) {
            $event.stopPropagation();
        }
        var title;
        var content;
        var label;
        if (isPublic) {
            title = $translate.instant('device.make-private-device-title', {deviceName: device.name});
            content = $translate.instant('device.make-private-device-text');
            label = $translate.instant('device.make-private');
        } else {
            title = $translate.instant('device.unassign-device-title', {deviceName: device.name});
            content = $translate.instant('device.unassign-device-text');
            label = $translate.instant('device.unassign-device');
        }
        var confirm = $mdDialog.confirm()
            .targetEvent($event)
            .title(title)
            .htmlContent(content)
            .ariaLabel(label)
            .cancel($translate.instant('action.no'))
            .ok($translate.instant('action.yes'));
        $mdDialog.show(confirm).then(function () {
            deviceService.unassignDeviceFromCustomer(device.id.id).then(function success() {
                vm.grid.refreshList();
            });
        });
    }

    function unassignDevicesFromCustomer($event, items) {
        var confirm = $mdDialog.confirm()
            .targetEvent($event)
            .title($translate.instant('device.unassign-devices-title', {count: items.selectedCount}, 'messageformat'))
            .htmlContent($translate.instant('device.unassign-devices-text'))
            .ariaLabel($translate.instant('device.unassign-device'))
            .cancel($translate.instant('action.no'))
            .ok($translate.instant('action.yes'));
        $mdDialog.show(confirm).then(function () {
            var tasks = [];
            for (var id in items.selections) {
                tasks.push(deviceService.unassignDeviceFromCustomer(id));
            }
            $q.all(tasks).then(function () {
                vm.grid.refreshList();
            });
        });
    }

    function makePublic($event, device) {
        if ($event) {
            $event.stopPropagation();
        }
        var confirm = $mdDialog.confirm()
            .targetEvent($event)
            .title($translate.instant('device.make-public-device-title', {deviceName: device.name}))
            .htmlContent($translate.instant('device.make-public-device-text'))
            .ariaLabel($translate.instant('device.make-public'))
            .cancel($translate.instant('action.no'))
            .ok($translate.instant('action.yes'));
        $mdDialog.show(confirm).then(function () {
            deviceService.makeDevicePublic(device.id.id).then(function success() {
                vm.grid.refreshList();
            });
        });
    }

    function manageCredentials($event, device) {
        if ($event) {
            $event.stopPropagation();
        }
        $mdDialog.show({
            controller: 'ManageDeviceCredentialsController',
            controllerAs: 'vm',
            templateUrl: deviceCredentialsTemplate,
            locals: {deviceId: device.id.id, isReadOnly: isCustomerUser()},
            parent: angular.element($document[0].body),
            fullscreen: true,
            targetEvent: $event
        }).then(function () {
        }, function () {
        });
    }
}

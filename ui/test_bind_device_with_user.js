<md-dialog aria-label="{{ 'device.assign-to-customer' | translate }}">
    <form name="theForm" ng-submit="vm.assign()">
        <md-toolbar>
            <div class="md-toolbar-tools">
                <h2 translate>device.assign-device-to-customer</h2><!--给显示的页面取名字的部分 -->
                <span flex></span>
                <md-button class="md-icon-button" ng-click="vm.cancel()">
                    <ng-md-icon icon="close" aria-label="{{ 'dialog.close' | translate }}"></ng-md-icon>
                </md-button>
            </div>
        </md-toolbar>
        <md-progress-linear class="md-warn" md-mode="indeterminate" ng-disabled="!$root.loading" ng-show="$root.loading"></md-progress-linear>
        <span style="min-height: 5px;" flex="" ng-show="!$root.loading"></span>
        <md-dialog-content>
            <div class="md-dialog-content">
                <fieldset>
                    <span translate>device.assign-device-to-customer-text</span>
                    <md-input-container class="md-block" style='margin-bottom: 0px;'>
                        <label>&nbsp;</label>
                        <md-icon aria-label="{{ 'action.search' | translate }}" class="material-icons">
                            search
                        </md-icon>
                        <input id="device-search" autofocus ng-model="vm.searchText"
                               ng-change="vm.searchDeviceTextUpdated()"
                               placeholder="{{ 'common.enter-search' | translate }}"/>
                    </md-input-container>
                    <div style='min-height: 150px;'>
					<span translate layout-align="center center"
                          style="text-transform: uppercase; display: flex; height: 150px;"
                          class="md-subhead"
                          ng-show="vm.noData()">device.no-devices-text</span>
                        <md-virtual-repeat-container ng-show="vm.hasData()"
                                                     tb-scope-element="repeatContainer" md-top-index="vm.topIndex" flex
                                                     style='min-height: 150px; width: 100%;'>
                            <md-list>
                                <md-list-item md-virtual-repeat="device in vm.theDevices" md-on-demand
                                              class="repeated-item" flex>
                                    <md-checkbox ng-click="vm.toggleDeviceSelection($event, device)"
                                                 aria-label="{{ 'item.selected' | translate }}"
                                                 ng-checked="device.selected"></md-checkbox>
                                    <span> {{ device.name }} </span>
                                </md-list-item>
                            </md-list>
                        </md-virtual-repeat-container>
                    </div>
                </fieldset>
            </div>
        </md-dialog-content>
        <md-dialog-actions layout="row">
            <span flex></span>
            <md-button ng-disabled="$root.loading || vm.devices.selectedCount == 0" type="submit"
                       class="md-raised md-primary">
                {{ 'action.assign' | translate }}
            </md-button>
            <md-button ng-disabled="$root.loading" ng-click="vm.cancel()" style="margin-right:20px;">{{ 'action.cancel' |
                translate }}
            </md-button>
        </md-dialog-actions>
    </form>
</md-dialog>
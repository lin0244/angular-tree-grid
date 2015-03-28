(function () {
  'use strict';

  angular.module('angular-tree-grid',[])
    .directive('nodeTree', function ($compile) {
      return {
        restrict : 'E',
        replace : true,
        scope : {
          item : "=nodeData",
          childrenLabel : "=",
          columnDef : '=columnDef',
          tableConfiguration  : '=',
          controls : '=',
          globals : '='
        },
        link : function (scope, element) {
          scope.openLevel = function (item,$event) {
            $event.stopPropagation();
            if( item.hasOwnProperty('_isExpanded') ) {            
              item._isExpanded = !item._isExpanded;
            }
          };

          var html = "<div class='node' ng-class='{active : globals._uuiSelected == item._uui}' ng-click='controls.onRowSelected(item)'>", def;

          for ( var i = 0; i < scope.columnDef.length; i++ ) {
            def = scope.columnDef[i];
            var partialTemplate;
            var width = scope.tableConfiguration.columnWidths[i];
            if ( def.treeField ) {
              var iconTemplate = "<div class='icon-content' ng-click='openLevel(item,$event)' style='padding-left:"+(scope.item._nodeLevel*scope.tableConfiguration.padding)+"px;'><i ng-if=\"item.hasOwnProperty('_isExpanded') && item._isExpanded == true\" class='{{tableConfiguration.iconExpanded}}' ></i><i ng-if=\"item.hasOwnProperty('_isExpanded') && item._isExpanded == false\" class='{{tableConfiguration.iconCollapsed}}' ></i></div>";
              if( def.hasOwnProperty('cellTemplate') ) {
                partialTemplate = def['cellTemplate'];
              } else {
                partialTemplate ="<div>{{item[\'"+def['field']+"\']}}</div>";
              }
              partialTemplate = "<div class='cell cell-tree' style='width:"+(width)+"%;'>" + iconTemplate + partialTemplate + "</div>";
            } else {
              if ( def.hasOwnProperty('cellTemplate') ) {
                partialTemplate ="<div class='cell' style='width:"+(width)+"%'>"+def['cellTemplate']+"</div>";
              } else {
                partialTemplate ="<div class='cell' style='width:"+(width)+"%'><div>{{item[\'"+def['field']+"\']}}</div></div>";
              }

            }
            html += partialTemplate;
          }
          html+="</div>";

          //check if this member has children
          element.html(html).show();
          if ( angular.isArray(scope.item.children) ) {
            // append the collection directive to this element
            element.append("<tree-body ng-show='item._isExpanded' collection='item[childrenLabel]' children-label='childrenLabel' column-def='columnDef' table-configuration='tableConfiguration' globals='globals' controls='controls'></tree-body>");
          }
          // we need to tell angular to render the directive
          $compile(element.contents())(scope);
        }
      };
    })
    .directive('treeHeader', function ($compile) {
      return {
        restrict : 'E',
        replace : true,
        scope : {
          columnDef : "=",
          tableConfiguration : "="
        },
        template : "<div class='tree-header'></div>",
        link : function (scope, element) {
          var html = "", def;
          for ( var i = 0; i < scope.columnDef.length; i++ ) {
            def = scope.columnDef[i];
            var partialTemplate;
            var width = scope.tableConfiguration.columnWidths[i];
            partialTemplate ="<div class='header-cell' style='width:"+(width)+"%'><div>{{columnDef["+i+"]['displayName']}}</div></div>";
            html += partialTemplate;
          }

          element.append(html);
          $compile(element.contents())(scope);
        }
      }
    })
    .directive('treeBody', function () {
      return {
        restrict : 'E',
        replace : true,
        scope : {
          collection : '=',
          childrenLabel : '=',
          columnDef : '=columnDef',
          tableConfiguration : '=',
          controls : '=',
          globals : '='
        },
        template : "<div><node-tree ng-repeat='nodeData in collection' node-data='nodeData' children-label='childrenLabel' column-def='columnDef' table-configuration='tableConfiguration' globals='globals' controls='controls'></node-tree></div>"
      };
    })
    .directive('angularTreeGrid', function ($compile) {
      function defineColumnWidth (colDefinition) {
        var widths = [],
          occupiedPercentage = 0,
          columnNoSet = 0,
          defaultWidth,
          column,
          i;

        for( i = 0; i < colDefinition.length; i++ ) {
          column = colDefinition[i];
          widths[i] = column.hasOwnProperty('width') ? column['width'] : 0;
          if( !widths[i] ) {
            columnNoSet++;
          }
          occupiedPercentage += widths[i];
        }

        defaultWidth = (100-occupiedPercentage) / columnNoSet;

        for( i = 0; i < widths.length; i++ ) {
          widths[i] = widths[i] || defaultWidth;
        }

        return widths;
      }

      return {
        restrict : 'E',
        replace : true,
        scope : {
          treeConfig : '='
        },
        template : "<div class='angular-tree-main-content'></div>",
        link : function (scope, element) {
          function guid() {
            function s4() {
              return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
          }

          function generateUID(tree, nestedField){
            var node;
            for ( var i = 0; i < tree.length; i++ ) {
              node = tree[i];
              node._uui = guid();
              generateUID(node[nestedField]||[], nestedField);
            }
          }

          function setFlag ( node, nestedField, flag, currentLevel ) {
            node ? node._nodeLevel = currentLevel:null;
            if ( node && node[nestedField] && node[nestedField].length > 0 ) {
              node._isExpanded = flag;
              node._isChild = false;
              for ( var  nodeIndex = 0; nodeIndex < node[nestedField].length; nodeIndex++ ) {
                setFlag( node[nestedField][nodeIndex], nestedField, flag, currentLevel+1 );
              }
            } else {
              node._isChild = true;
            }
          }

          function addFlagCollection (data, flagToSet) {
            var collection = data.collection,
              nestedField = data.childrenField,
              //flag = data.collapseElements,
              nodeRootIndex;

            for( nodeRootIndex = 0; nodeRootIndex < collection.length; nodeRootIndex++ ) {
              setFlag(collection[nodeRootIndex], nestedField, flagToSet, 0);
            }
          }

          function findChildByUUI ( treeNode, nestedField, uuiSelected, cb ) {
            if( treeNode && treeNode[nestedField] && treeNode[nestedField].length > 0 ) {
              var node;
              for( var i = 0; i < treeNode[nestedField].length; i++ ) {
                var node = treeNode[nestedField][i];
                if ( node._uui === uuiSelected ) {
                  cb ? cb(treeNode):null;
                  return treeNode;
                } else {
                  findChildByUUI( node, nestedField, uuiSelected );
                }
              }
              return null;
            }
            return null;
          }

          function getParentNode (treeConfig, uuiSelected, cb) {
            var collection = treeConfig.collection,
              nestedField = treeConfig.childrenField,
              result;

            if ( uuiSelected ) {
              for( var i = 0; i < collection.length; i++ ) {
                result = result || findChildByUUI( collection[i], nestedField, uuiSelected, cb);
              }
            }
            return result;
          }

          var unBind = scope.$watch('treeConfig', function (data) {

            if ( data && data.collection && data.colDefinition ) {
              generateUID(scope.treeConfig.collection,scope.treeConfig.childrenField);
              addFlagCollection(scope.treeConfig, scope.treeConfig.collapseElements);

              if (angular.isArray(scope.treeConfig.collection)) {
                scope.tableConfiguration = {
                  iconExpanded  : scope.treeConfig.iconExpanded,
                  iconCollapsed : scope.treeConfig.iconCollapsed,
                  padding       : scope.treeConfig.padding,
                  columnWidths  : defineColumnWidth(scope.treeConfig.colDefinition)
                };

                scope.globals = {
                  childrenField  : scope.treeConfig.childrenField,
                  columnDef      : scope.treeConfig.colDefinition,
                  disabledLevels : scope.treeConfig.disabledLevels,
                  _uuiSelected   : null
                };

                scope.treeConfig.controls = {
                  onRowSelected : function ( item ) {
                    if ( scope.globals._uuiSelected != item._uui ) {
                      scope.globals._uuiSelected = item._uui;
                      scope.treeConfig.onClickRow(item);
                    } else {
                      scope.globals._uuiSelected = null;
                      scope.treeConfig.onClickRow(null);
                    }
                  },
                  expandAll : function () {
                    addFlagCollection(scope.treeConfig, true);
                  },
                  collapseAll : function () {
                    addFlagCollection(scope.treeConfig, false);
                  },
                  getParentNode : function () {
                    getParentNode( scope.treeConfig, scope.globals._uuiSelected , function (parentNode) {
                    });
                  }
                };

                var selectByDefault = scope.treeConfig.selectByDefault;
                if( selectByDefault ) {
                  var node = scope.treeConfig.collection[0];
                  scope.globals._uuiSelected = node._uui;
                  if( selectByDefault.triggerClick ) {
                    scope.treeConfig.onClickRow( node );
                  }
                }

                // append the collection directive to this element
                var treeHeader  = "<tree-header ng-if='treeConfig.enableHeader' column-def='treeConfig.colDefinition' table-configuration='tableConfiguration'></tree-header>";
                var treeContent = "<tree-body  class='tree-content' collection='treeConfig.collection' children-label='treeConfig.childrenField' column-def='treeConfig.colDefinition' table-configuration='tableConfiguration' globals='globals' controls='treeConfig.controls'></tree-body>"
                var html = treeHeader+treeContent;
                element.append(html);
                // we need to tell angular to render the directive
                $compile(element.contents())(scope);
              }
              unBind();
            }
          });
        }
      };
    });
})();


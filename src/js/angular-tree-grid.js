(function () {
  'use strict';

  function treeFilter(list, labels, fields) {
    var currentPath = [];

    function depthFirstTraversal(o, fn) {
      currentPath.push(o);
      if (o.children) {
        for (var i = 0, len = o.children.length; i < len; i++) {
          depthFirstTraversal(o.children[i], fn);
        }
      }
      fn.call(null, o, currentPath);
      currentPath.pop();
    }

    function shallowCopy(o) {
      var result = {};
      for (var k in o) {
        if (o.hasOwnProperty(k)) {
          result[k] = o[k];
        }
      }
      return result;
    }

    function copyNode(node) {
      var n = shallowCopy(node);
      if (n.children) {
        n.children = [];
      }
      return n;
    }

    function findOnFields ( node, label ) {
      //if( node ) {
        for(var i = 0 ;i < fields.length; i++ ) {
          if( node.hasOwnProperty(fields[i]) ) {
            if( (node[fields[i]].toLowerCase().indexOf(label.toLowerCase())) !== -1 ) {
              return true;
            }
          }
        }
      //}
      return false;
    }

    function filterTree(root, labels) {
      root.copied = copyNode(root); // create a copy of root
      var filteredResult = root.copied;

      depthFirstTraversal(root, function (node, branch) {
        //console.log("node.$$hashKey: " + node.$$hashKey);
        // if this is a leaf node _and_ we are looking for its ID
        //if( labels[0].toLowerCase().indexOf(node.descripcion.toLowerCase()) !== -1 ) {  // has the same description
        //if (node.descripcion.toLowerCase().indexOf(labels[0].toLowerCase()) !== -1) {    // filter is content in any description
        if ( findOnFields(node, labels[0]) ) {    // filter is content in any description
          // use the path that the depthFirstTraversal hands us that
          // leads to this leaf.  copy any part of this branch that
          // hasn't been copied, at minimum that will be this leaf
          for (var i = 0, len = branch.length; i < len; i++) {
            if (branch[i].copied) {
              continue;
            } // already copied

            branch[i].copied = copyNode(branch[i]);
            // now attach the copy to the new 'parellel' tree we are building
            branch[i - 1].copied.children.push(branch[i].copied);
          }
        }
      });

      depthFirstTraversal(root, function (node, branch) {
        delete node.copied; // cleanup the mutation of the original tree
      });
      return filteredResult;
    }

    var filteredList = [];
    for (var i = 0, len = list.length; i < len; i++) {
      var filtered = filterTree(list[i], labels);
      if ((filtered && filtered.children && filtered.children.length > 0) ||
        filtered.descripcion.toLowerCase() === labels[0].toLowerCase()) {
        filteredList.push(filtered);
      }
    }

    return filteredList;
  }


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

          var html = "<div class='node' ng-class='{active : globals._uuiSelected == item._uui, disabled : globals.disabledLevels.indexOf(item._nodeLevel) >= 0}' ng-click='controls.onRowSelected(item)'>", def;

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
        template : "<div><node-tree ng-repeat='nodeData in collection' ng-show='nodeData._show' node-data='nodeData' children-label='childrenLabel' column-def='columnDef' table-configuration='tableConfiguration' globals='globals' controls='controls'></node-tree></div>"
      };
    })
    .directive('angularTreeGrid', function ($compile, $filter) {
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

          function matchWithFiltered (tree, filteredTree, nestedField) {
            var node, filteredIndex, nodeFiltered, nodeIndex = 0, i;
            for ( i = 0; i < tree.length; i++ ) {
              node = tree[i];
              node._show = false;
              for( filteredIndex = 0; filteredIndex < filteredTree.length && !node._show; filteredIndex++ ) {
                nodeFiltered = filteredTree[filteredIndex];
                if( node._uui === nodeFiltered._uui ) {
                  node._show = true;
                  matchWithFiltered(
                    node[nestedField]||[],
                    nodeFiltered[nestedField],
                    nestedField
                  );
                }
              }
            }
          }

          function findByKeyAndValue (tree, nestedField, field, value) {
            var node, i, result = null;
            for ( i = 0; i < tree.length && !result; i++ ) {
              node = tree[i];
              if( node.hasOwnProperty(field) && node[field] == value ) {
                return node;
              } else {
                result = findByKeyAndValue(node[nestedField], nestedField, field, value);
              }
              if( result ) {
                return result;
              }
            }
            return null;
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

          function isMyChild ( node, nestedField, uuiChild ) {
            if( node._uui === uuiChild ) { // if is the node selected return itself
              return node;
            } else if( node._isChild ) { // validated if is left node to don't make more process
              return null;
            } else { // make process to do a loop over its children of this node
              var child;
              for ( var i = 0; i < node[nestedField].length; i++ ) {
                child = node[nestedField][i];
                var nodeSelected = isMyChild(child, nestedField, uuiChild);
                if( nodeSelected ) {

                }
              }
            }
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

          function enableSearh () {
            scope.treeConfig.filteredData = treeFilter(scope.treeConfig.collection, [""], scope.globals.fields);
            scope.$watch('treeConfig.search', function (value) {

              scope.treeConfig.filteredData = treeFilter(scope.treeConfig.collection, [value], scope.globals.fields);

              matchWithFiltered(
                scope.treeConfig.collection,
                scope.treeConfig.filteredData,
                scope.treeConfig.childrenField
              );
            });

            matchWithFiltered(
              scope.treeConfig.collection,
              scope.treeConfig.filteredData,
              scope.treeConfig.childrenField
            );
          }

          function getFields(){
            var fields = [],
              defs = scope.treeConfig.colDefinition;
            for ( var i = 0; i < defs.length; i++ ) {
              if( defs[i].hasOwnProperty('field') ) {
                fields.push( defs[i]['field'] );
              }
            }
            return fields;
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
                  columnWidths  : defineColumnWidth(scope.treeConfig.colDefinition),
                  bgColor       : scope.treeConfig.contentColor
                };

                scope.globals = {
                  childrenField  : scope.treeConfig.childrenField,
                  columnDef      : scope.treeConfig.colDefinition,
                  disabledLevels : scope.treeConfig.disabledLevels || [],
                  _uuiSelected   : null,
                  fields         : getFields()
                };


                scope.treeConfig.controls = {
                  onRowSelected : function ( item ) {
                    if( scope.globals.disabledLevels.indexOf( item._nodeLevel ) < 0 ) {
                      if ( scope.globals._uuiSelected != item._uui ) {
                        scope.globals._uuiSelected = item._uui;
                        scope.treeConfig.onClickRow(item);
                      } else {
                        scope.globals._uuiSelected = null;
                        scope.treeConfig.onClickRow(null);
                      }
                    }
                  },
                  expandAll : function () {
                    addFlagCollection(scope.treeConfig, true);
                  },
                  collapseAll : function () {
                    addFlagCollection(scope.treeConfig, false);
                  },
                  selectByKeyAndValue : function (key, value) {
                    var node = findByKeyAndValue(
                      scope.treeConfig.collection,
                      scope.treeConfig.childrenField,
                      key,
                      value
                    );

                    if( node ) {
                      scope.globals._uuiSelected = node._uui;
                    } else {
                      scope.globals._uuiSelected = "";
                    }

                    scope.treeConfig.onClickRow( node );
                  },
                  getParentNode : function () {
                    getParentNode( scope.treeConfig, scope.globals._uuiSelected , function (parentNode) {
                    });
                  }
                };

                var selectByDefault = scope.treeConfig.selectByDefault, node;
                if( selectByDefault ) {
                  if( scope.treeConfig.collection && selectByDefault ) {
                    if( selectByDefault.itemToSelect ) {
                      node = findByKeyAndValue(
                        scope.treeConfig.collection,
                        scope.treeConfig.childrenField,
                        selectByDefault.itemToSelect.field,
                        selectByDefault.itemToSelect.value
                      );
                    } else if ( selectByDefault.firstByDefault ) {
                      node = scope.treeConfig.collection[0] || null;
                    }

                    if( node ) {
                      scope.globals._uuiSelected = node._uui;
                    } else {
                      scope.globals._uuiSelected = "";
                    }
                    if( selectByDefault.triggerClick ) {
                      scope.treeConfig.onClickRow( node );
                    }
                  }
                }

                // append the collection directive to this element
                var treeHeader  = "<tree-header ng-if='treeConfig.enableHeader' column-def='treeConfig.colDefinition' table-configuration='tableConfiguration'></tree-header>";
                var treeContent = "<tree-body  class='tree-content' style='background-color: {{treeConfig.contentColor}}' collection='treeConfig.collection' children-label='treeConfig.childrenField' column-def='treeConfig.colDefinition' table-configuration='tableConfiguration' globals='globals' controls='treeConfig.controls'></tree-body>"
                var html = treeHeader+treeContent;
                element.append(html);
                // we need to tell angular to render the directive
                $compile(element.contents())(scope);

                if( scope.treeConfig.hasOwnProperty('search') ) {
                  enableSearh();
                } else {
                  matchWithFiltered( scope.treeConfig.collection, scope.treeConfig.collection, scope.treeConfig.childrenField );
                }
              }
              unBind();
            }
          });
        }
      };
    });
})();


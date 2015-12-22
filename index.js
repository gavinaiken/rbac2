var _     = require('lodash'),
    async = require('async');

function RBAC(rules, checkFullPath) {
    this.rules = rules;
    this.checkFullPath = !!checkFullPath;
}
RBAC.prototype = {
    'check': function (role, permission, params, cb) {
        var result = false;

        // If params not given, consider last argument as callback
        if (arguments.length < 4) {
            cb     = params;
            params = {};
        }

        // Create a rbac tree from the current role
        var tree = {
            'value'   : role,
            'children': toTree(role, this.rules)
        };
        // console.log('tree: ');
        // console.log('-----------------')
        // printTree(tree);
        // console.log('(*) conditional')
        // console.log();

        // Find all paths from root to permission
        var paths = findPaths(tree, permission);
        // Sort by shortest first (i.e. no. of nodes)
        paths = _.sortBy(paths, function (path) {
            return path.length;
        });
        // console.log();
        // console.log('paths: ');
        // console.log('-----------------')
        // _.each(paths, printPath);

        var checkFullPath = this.checkFullPath;
        // Check each path serially
        async.eachSeries(paths, function (path, cb) {
            // console.log();
            // console.log();
            // console.log('# Testing path:\t' + _.pluck(path, 'value').join(' -> '));
            // console.log('-----------------')
            checkPath(path, 1, params, checkFullPath, function (err, res) {
                if (!err && res) {
                    result = true;
                    return cb(new BreakError('passed'));
                }

                cb(err, null);
            });
        }, function (err) {
            if (err && err instanceof BreakError) {
                return cb(null, result);
            }

            cb(err, result);
        });
    }
};

function BreakError(msg) {
    Error.apply(this, arguments);
}
BreakError.prototype = new Error();

// function printTree(root, depth) {
//     var self = arguments.callee;
//     if (typeof depth === 'undefined') {
//         depth = 0;
//     }

//     var gap = '';
//     for (var i = 0; i < depth; i++) {
//         gap = gap + '\t';
//     }

//     console.log(gap + '- ' + root.value + (root.when ? '*' : ''));
//     _.each(root.children, function (child) {
//         self(child, depth + 1);
//     });
// }

// function printPath(path) {
//     console.log(_.map(path, function(node) {
//         return node.when ? (node.value + '*') : node.value;
//     }).join(' --> '));
// }

function toTree(role, rules) {
    var self = arguments.callee;

    return _.reduce(rules, function (arr, rule) {
        if (rule.a === role) {
            arr.push({
                'value'   : rule.can,
                'when'    : rule.when,
                'children': self(rule.can, rules)
            });
        }
        return arr;
    }, []);
}

function findPaths(root, permission) {
    var self  = arguments.callee;
    var paths = [];

    if (root.value === permission) {
        paths.push([root]);
    } else {
        _.each(root.children, function (child) {
            var childpaths = self(child, permission);

            _.each(childpaths, function (childpath) {
                var path = [root];
                path.push.apply(path, childpath);
                paths.push(path);
            });
        });
    }

    return paths;
}

function checkPath(path, index, params, checkFullPath, cb) {
    if (index >= path.length) {
        // console.log('crossed end of path - WIN');
        // reached end
        return cb(null, true);
    }

    var self = arguments.callee;
    var node = path[index];
    // console.log('\t- checking: ' + index + ': ' + node.value);

    if (!node.when) {
        if (!checkFullPath || !node.children) {
            // console.log('\t\t* No testing condition specified - SUCCESS');
            // no condition to get access to this node,
            // permission granted
            return cb(null, true);
        } else {
            // console.log('\t\t* continue checking path');
            return self(path, index + 1, params, checkFullPath, cb);
        }
    } else {
        // test condition associated with current node
        // console.log('\t\t* Running user provided test...');
        node.when(params, function (err, res) {
            if (!err && res) {
                // reached this node, move on to next
                // console.log('\t\t\t... PASSED');
                self(path, index + 1, params, checkFullPath, cb);
            } else {
                // console.log('\t\t\t... FAILED. Path discarded');
                return cb(err, false);
            }
        });
    }
}

module.exports = RBAC;

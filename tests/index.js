var assert = require('assert'),
    RBAC   = require('../');

var rules = [
    {a: 'visitor'        , can: 'read articles'},
    {a: 'user'           , can: 'vote on articles'},
    {a: 'article editor' , can: 'edit article'},
    {a: 'user'           , can: 'article editor', when: function (params, cb) {
        if (params.userId === 2) {
            return cb(null, true);
        }
        cb(null, false);
    }},
    {a: 'admin'          , can: 'user'},
    {a: 'admin'          , can: 'article editor'},
    {a: 'superadmin'     , can: 'delete user'},
    {a: 'superadmin'     , can: 'admin'},
    {a: 'user'           , can: 'visitor'},
    {a: 'user'           , can: 'read articles'}
];

var rbac = new RBAC(rules);

describe('RBAC', function () {
    describe('check', function () {
        it('should work with no-condition paths', function (done) {
            rbac.check('admin', 'read articles', function (err, res) {
                if (err) {
                    throw err;
                }
                assert.ok(res);
                done();
            });
        });
        it('should work with conditional functions - fail case', function (done) {
            rbac.check('user', 'edit article', function (err, res) {
                if (err) {
                    throw err;
                }

                assert.ok(!res);
                done();
            });
        });
        it('should work with conditional functions - pass case', function (done) {
            rbac.check('user', 'edit article', {
                userId: 2
            }, function (err, res) {
                if (err) {
                    throw err;
                }

                assert.ok(res);
                done();
            });
        });
    });
});

# rbac2
[![NPM version](https://badge.fury.io/js/rbac2.svg)](http://badge.fury.io/js/rbac2)

Simple RBAC checker with support for context checks.

## Installation

```bash
npm install rbac2
```

## Usage
### Simple roles
```js
var RBAC = require('rbac2');

var rules = [
    {a: 'author', can: 'publish posts'},
    {a: 'editor', can: 'edit posts'},
    {a: 'editor', can: 'author'},
    {a: 'admin',  can: 'editor'},
    {a: 'admin',  can: 'do admin'}
];

var rbac = new RBAC(rules);

// Perform a check
rbac.check('admin', 'edit posts', function (err, result) {
    // result: true
});
```

### Adding context checks
You can specify context checks in rules by adding a `when` function:
```js
var rules = [
    {a: 'author', can: 'publish posts'},
    {a: 'editor', can: 'edit posts'},
    {a: 'user',   can: 'editor', when: function (params, callback) {
        db.findOne('tbl_post_editors', {
            'post_id': params.postId,
            'user_id': params.userId
        }, callback);
    }},
    {a: 'editor', can: 'author'},
    {a: 'admin',  can: 'editor'},
    {a: 'admin',  can: 'do admin'}
];
```
And check by passing context parameters:
```js
rbac.check('user', 'edit posts', {postId: 23, userId:12}, function (err, result) {
    // ...
});
```

In the code above, we set the rule that any user can become the editor
for a post only if that user has the 'editor' role for the post in the database.
Here, `when` is a user-provided check that will be given `params` from the `check` call.

After doing business logic checks, the `when` function should call the callback
as `callback(err, result)`, where `result` should be boolean. (If `err` is not
`null`, then `result` is considered `false`)

### About rules
#### No subject, role or permission - only hierarchy
This is valid:
```js
var rules = [
    {a: 'editor',     can: 'edit posts'},
    {a: 'edit posts', can: 'change post url'}
];
```

#### Cyclic hierarchy is NOT supported
This is invalid:
```js
var rules = [
    {a: 'admin', can: 'user'},
    {a: 'user',  can: 'admin', when: function (err, callback) {...}}
];
```

and will result in an indefinite loop.

#### Conditional and non-conditional paths
Given these rules:
```js
var rules = [
    {a: 'editor', can: 'edit posts'},
    {a: 'user',   can: 'editor', when: function (params, callback) {
        // business logic check
    }},
    {a: 'admin',  can: 'user'}
];
```

If we check from a 'user' role:
```js
rbac.check('user', 'edit posts', {...}, function (err, res) {
    // ...
});
```

The following path is checked:
```txt
'user' --> 'editor' [conditional] --> 'edit posts'
```

To go from 'user' to 'editor', the context condition must be satisfied.

But, if we check from a 'admin' role:
```js
rbac.check('admin', 'edit posts', function (err, res) {
    // ...
});
```

The following path is checked:
```txt
'admin' --> 'user' --> 'editor' [conditional] --> 'edit posts'
```

To go from 'admin' to 'user', there is no condition. So the rest of the path is
considered to be checked AND successful.

> **In general**: Paths are traveresed continuously till conditional checks exist;
> if a node in the path is hopped without a conditional check, the remaining path
> is considered to be solved and the result is true.

## Testing
Install dev dependencies and run:
```bash
npm test
```

## License
[MIT](LICENSE)

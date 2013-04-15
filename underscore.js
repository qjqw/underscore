// Underscore.js 1.4.4
// ===================

// > http://underscorejs.org
// > (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
// > Underscore may be freely distributed under the MIT license.

// Baseline setup
// --------------
(function() {

  // Establish the root object, `window` in the browser, or `global` on the server.
  // 声明一个引用指向全局对象  浏览器中是 window， nodejs 中是 global
  var root = this;

  // Save the previous value of the `_` variable.
  // 声明一个引用指向之前版本的 underscore 的下划线，以便后面的 noConflict 使用
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  // 定义一个可以跳出 each 循环的对象，后面会用到
  // 把 breaker 设置为 object 的原因是 object 具有唯一性，
  // 用等号判断是否相等时，只有当前的 object 的两个引用才会相等，其它都是不等的
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  // 先把一些浏览器自定对象的 prototype 保存下来，以供后面使用
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  // 先保存一些原生方法的引用，后面会用到
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  // 同上，只不过这样方法是 es5 的，低级浏览器不支持
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  // 虽然我们能直接用 _.each 等等方法直接调用 underscore 提供的函数，
  // 但是其实 _ 是一个 function， function 的作用是返回一个 underscore
  // 对象，类似于各种库的 $() 会把 dom 元素包装成相应的对象一样，最常见的像
  // jQuery，会把 dom 元素包装成 jQuery 对象，使其拥有 jQuery 的特有方法.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  // 如果在 nodejs 中，就把 underscore 放在 module.exports 中，
  // exports 是 nodejs 的一个接口，通过 require('XXX.js') 这种方式，
  // 会把 XXX.js 中的 module.exports 做为返回值，所以
  // var _ = require('underscore'); 就能取到 underscore 了。
  // 在浏览器中，则是直接把 underscore 放到 window._ 中。
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  // 设置当前的版本号
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  // each 方法
  var each = _.each = _.forEach = function(obj, iterator, context) {
    // 先判断 obj 是否存在
    if (obj == null) return;
    // 如果浏览器已经为 obj 提供了 forEach 方法，就调用原生 forEach
    // 否则用 js 实现
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    // 通过数值转换判断 length 是不是 Number 类型
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        // 如果传进来的函数，执行结果于 breaker 相同，则跳出循环
        // 比如 
        // each( [ 1, 3, 4 ], function( value, index ) {
        //   if ( value === 3 ) {
        //     return breaker;
        //   }
        // });
        // 用上面那种方式返回 breaker，在这里会判断返回值是不是 === breaker
        // 如果相等就跳出循环，下面会有很多方法用到这个。
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    // 没有 length 属性，则为每一个私有属性都执行一遍 iterator..
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  // map 函数
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    // 先判断 obj 是不是支持 map，如果支持就用原生 map
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    // 为每个元素执行一遍 iterator，并把返回结果放到 results 中
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  // 就像 ECMAScript 5 中的 reduce，比原生的 reduce 多接收一个 context 参数
  // 而且原生 reduce 只支持 Array，这个扩展了 Object
  // 这个函数的作用是为一个 obj 的每一个属性都执行一遍传进的方法，并把
  // 所有结果相加并返回
  // _.reduce( [1, 2, 3 ], function( a, b ) {
  //   return a + b;
  // }, 10 );
  // 结果是 16  ( 10 + 1 + 2 + 3 )
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    // 先判断原生 reduce
    if (nativeReduce && obj.reduce === nativeReduce) {
      // 先处理一下 context，把 context 绑定到方法中
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      // 如果没有初始值，在第一次运行的时候把初始值设置为第一个参数的 value
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        // 计算上一次的运算结果与本次的 value 的值，并保存为新的运算结果
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  // 同上，对不支持 reduceRight 的对象实现 reduceRight..
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    // 先判断 obj 是否支持原生 reduceRight
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    // 先判断是否有 length 属性
    var length = obj.length;
    // 如果 length 不是 number 类型的数值，把 length 设置为 obj 的属性个数..
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      // 如果 keys 为无效值，说明 obj 本身具有 length，不需要额外处理 index 为 length - 1
      // 如果是有效值，传进来的 obj 可能仅仅为一个 object 类型，比如 { 'a': '1' }，对这种
      // 参数对返回属性名做为 index
      index = keys ? keys[--length] : --length;
      // 如果函数调用的时候没设置初始值，则把 obj 最右的属性设置为初始值
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        // 依次计算结果，保存到 memo 中
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  // find 方法..
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    // 调用 any 方法，对每个属性都进行一次运算
    any(obj, function(value, index, list) {
      // 如果 iterator 的返回值为 true，把 value 保存到 result 中，并且 return true
      // 跳出循环
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    // 返回 result
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  // 类似 find，只不过 find 返回第一个找到的值，filter 则返回一个结果 List
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    // 调用原生 filter
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      // 把符合条件的结果放到 results 中
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  // 根 filter 相反，把不符合条件的结果放到 list 中
  _.reject = function(obj, iterator, context) {
    // 调用 filter..
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  // 只有 obj 中所有元素对 iterator 的结果为 true， every 才返回 true..
  _.every = _.all = function(obj, iterator, context) {
    // 如果没传进 iterator，就把 iterator 指向一个默认 function..
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    // 优先调用原生 every
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    // 调用 each 函数，如果有不符合条件的元素，跳出循环
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    // 如果返回结果全都有效，!!result 为 true，只要有无效值，!!result 就是 false
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  // 对 obj 中的值用 iterator 运算，只要有返回值是 true 的属性，就返回 true，否则为 false
  // 相对来说这个比较像 ||，而 every 像 &&
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    // 判断 obj 是否有原生 some 方法，高级浏览器中 Array 有，Object 没有，所以
    // 不管什么情况， Object 都会走下面 each 方法
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      // 如果 result 的值是有效值就跳出 each 循环
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  // 类似 in 语句，只不过 in 判断的是属性，而 contains 判断是 value..
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    // 优先调用原生 indexOf
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    // 调用 any 方法判断 obj 中是否有 value === target
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  // map 的升级版，对 obj 的每一个属性执行相应的 method，
  // 并把结果保存到一个数组中返回
  _.invoke = function(obj, method) {
    // 利用传进来的 arguments 创建一个新的 array，后面 apply 会用到
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    // 结果不还是调 map..
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  // 取出集合中每个对象的 key 属性的 value 值，放到一个 Array 里
  // 类似 var test = { 'a': {'name':'test1'}, 'b': { 'name':'test2'} };
  // _.pluck( test, 'name' ); 会返回 [ 'test1', 'test2' ];
  _.pluck = function(obj, key) {
    // ..调用 map 方法
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  // 依次判断一个集合中的每一个对象，attrs 的相应值是否与对象的相对应的属性相等，
  // 如果有 first 参数，只返回第一个符合条件的属性，否则返回所有符合条件的...
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    // 如果 first 为 true，就调用 find，否则调用 filter
    return _[first ? 'find' : 'filter'](obj, function(value) {
      // 依次检查 attrs 的每个 key 是否于 value 的 key 相等
      for (var key in attrs) {
        // 只要有不等的属性就返回 false
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  // ..只不过是包装了一下 where..
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  // 对集合的每个对象都用 iterator 执行一遍，并返回执行结果中最大的值 
  _.max = function(obj, iterator, context) {
    // 如果对象是一个数组，并且数组的值是数字，调用原生的 Math.max 方法
    // 根据英文注释，长度不能大于整型的上限
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    // computed 是计算过的数值， value 是计算前的值
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    // 返回对应的值
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  // 类似 max，计算最小值，代码有点重复，不知道是不是为了运行效率..
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  // 搞乱一个 array
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      // 创建一个 0 到 index 之间的随机数，再把 index 加 1
      // 并交换随机数位置与 index 位置的值
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  // 作用是确保一个值是 function..
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  // 根据传进的 value 函数对一个 obj 排序
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    // 用 map 函数把 obj 中的值取出来，并用 criteria 计算后进行排序
    // 然后再用 pluck 方法把排好序的 value 值从 map 的返回结果中取出放到 Array 里
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  // groupBy 和 countBy 需要用到这个方法 
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      // 计算 iterator 的执行结果
      var key = iterator.call(context, value, index, obj);
      // 用传进来 behavior 处理 value 和 key
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  // 根据 value 的运算结果进行分类， value 可以是一个属性
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      // 把 value 方法的计算结果进行分类，放到 result 中
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  // 统计属于同一类的属性数量
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      // 把 value 方法的计算结果进行分类，并且统计每个分类的数量放到 result 中
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  // 根据 iterator 的运算结果计算 obj 在 array 中的位置
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    // 二分查找..
    while (low < high) {
      // ........ 计算 low 和 high 中间的数，利用二进制
      // 果然二进制牛X
      // 比如 2 用二进制表式为 10， 8 用二进制表式为 1000
      // 2 + 8 表式为 1010，用 >>> 向右移一位，变成 101 结果是 5 ....
      var mid = (low + high) >>> 1;
      // 不断于中间的数进行对比
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  // 把 obj 转换成一个 array
  _.toArray = function(obj) {
    if (!obj) return [];
    // 先判断是不是 array 类型
    if (_.isArray(obj)) return slice.call(obj);
    // 如果有 length 属性，利用 map 和 identity 把每个值都取出来放到数组里返回
    // 其实这个用 slice 方法就可以了
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    // 没有 length 属性，只能用 for .. in .. 返回一个数组了
    return _.values(obj);
  };

  // Return the number of elements in an object.
  // 判断一个 obj 有多少个属性
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  // 返回前 n 个元素
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  // 返回 0 到从后向前数第 n - 1 个元素的数组
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  // 返回一个数组的后 n 个元素
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  // 返回一个数组的从 n 到数组末尾的元素，跟 last 不一样的是，last 是从后向前数第 n 个，而 rest 是从前向后数第 n 个
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  // 从一个数组中去掉无效值，返回一个新数组
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  // 把一个数组中的子数组的值取出来，放到 output 中,比如 [1,2,['a','b']] 执行完为 [1,2,'a','b']
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      // 判断是否是 Array，如果传了 shallow，只是把 array 与 output 连接起来
      // push 可以多个参数  [].push(1,2,3,4,5); 结果是 [1,2,3,4,5];
      // 如果没设置 shallow 则递规进行深度合并
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  // 类似上面的方法，不同的是不接受 output，只能返回一个新创建的数组..
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  // 比较 array 中与传递的参数不等的数据，比如 _.without( [1, 3, 4, 5], 1, 4 ); // [3, 5]
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  // 数组去重
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    // 如果没传进 isSorted 值，就把 iterator 和 context 向前移一位
    // 并把 isSorted 设置为 false
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    // 如果传进了 iterator，就用 iterator 先处理一便数组
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      // 如果传进的数组已经排好序，就把 value 与前一位比较，
      // 如果没排好序就用 contains 判断是 value 是否与 seen 某个值相等
      // 如果不相等，把当前元素放到结果中
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  // 对多个数组进行去重
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  // 求 n 个数组的交集
  _.intersection = function(array) {
    // 把除去第一个参数的所有参数都放到数组里
    var rest = slice.call(arguments, 1);
    // 把 array 去重，再用 filter 筛选出合适的结果
    return _.filter(_.uniq(array), function(item) {
      // 为 array 的每个值都去 rest 的数组集合里查找一遍
      // 如果每个数组里都有 item 值，返回 true
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  // 类似 without，但是相对 without 可接受多个数组的参数格式
  // 例如
  // _.difference( [1,3,4,5,6,7], [1,3], [6,7] ); // [4,5]
  // 可以传两个数组与第一个进行比较
  _.difference = function(array) { 
    // 把需要比较的数组合并为一个数组
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    // 用 filter 找出 array 中与 rest 不相同的数据
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  // 把参数中的所有数组分别整合
  // http://underscorejs.org/ 上的例子
  // _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
  // => [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
  _.zip = function() {
    // 把传进来的参数整合到一个数组中
    var args = slice.call(arguments);
    // 找出最大的数组长度
    var length = _.max(_.pluck(args, 'length'));
    // 以最大的数组长度为准创建一个保存结果的数组
    var results = new Array(length);
    // for 循环，并利用 pluck 把参数分别从数组中取出来
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  // 根据两个数组创建一个 object..   
  // 例如 ['name1','name2']  ['XiaoHongmao','DaHuilang']
  // 会返回 { 'name1': 'XiaoHongmao', 'name2': 'DaHuilang' }
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    // 根据 list 的属性循环创建 obj 的属性
    for (var i = 0, l = list.length; i < l; i++) {
      // 如果传了 values，就把 values[i] 放到 result[ list[i] ] 中
      if (values) {
        result[list[i]] = values[i];
      // 如果没传 values 就把 list 当做一个二维数组的集合，并把子数组的
      // 第一个值当做属性名，第二为属性值放到 result 中
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      // 如果 isSorted 是 number 类型，就设置为默认查找下标
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        // 如果排过序就用二分查找找到 item 的位置
        i = _.sortedIndex(array, item);
        // 如果没找到就返回 -1，找到了返回相应下标
        return array[i] === item ? i : -1;
      }
    }
    // 优先用原生 indexOf
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    // 如果没有原生 indexOf 就用 for 循环查找
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    // 优先用原生 lastIndexOf
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    // 从到 i 个数向前查找
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  // 用 start stop 设置的数字区间，把这个区间按照 step 的长度分成 n 份，并返回数组
  // 比如 _.range( 0, 6, 2 ); ==> [ 0, 2, 4 ] 
  _.range = function(start, stop, step) {
    // 如果没传 stop，就把 stop 设置为 start，start 设为 0
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    // 计算需要分成多少份
    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    // 依次设置数值
    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  // 绑定一个 function 的上下文对象
  _.bind = function(func, context) {
    // 优先用原生 bind
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    // 利用闭包原理绑定上下文
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  // 绑定一个 function 的 n 个参数，比如
  // var plus = _.partial( function( a, b, c ) {
  //   return a + b + c;
  // }, 1, 2 );
  // 上面把 1 和 2 绑定给了匿名函数 function( a, b, c ){ ... } 并返回了一个新函数
  // plus( 3 ) => 输出 6，因为前两个参数已经绑定了
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };
 
  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  // obj 的 function 上下文绑给自己
  _.bindAll = function(obj) {
    // 把传进的 n 个函数名整合为一个数组
    var funcs = slice.call(arguments, 1);
    // 如果只传了 obj，没传函数名，那么就取出 obj 所有函数
    if (funcs.length === 0) funcs = _.functions(obj);
    // 依次绑定
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  // 缓存 func 的处理结果
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      // 用 hasher 来计算缓存的属性名
      var key = hasher.apply(this, arguments);
      // 贮存结果或者取出已经缓存的结果
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  // 如函数名，延迟触发一个方法..
  _.delay = function(func, wait) {
    // 保存参数
    var args = slice.call(arguments, 2);
    // 用 setTimeout 做延迟
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  // 相当于 setTimeout 0，由于 Javascript 是单线程的，所以它有一个
  // 函数执行栈，defer 的作用是直到栈中没有函数的时候才触发
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  // 返回一个在一段时间内只会执行一次的函数
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      // 保存当前时间
      var now = new Date;
      // 计算还有多长时间才能触发函数
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      // 如果时间限制已经过了，立即执行 func，把当前时间保存到 previous 里
      // 清除 timeout 并重新计算 result，
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      // 如果时间限制没过，就用 setTimeout 设置时间过了几后再执行 func
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      // 返回结果
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  // 这个跟上面的函数类似，但是有不同的地方，比如var a = _.throttle( function(){} , 500 );
  // a(); 这时候执行第一次，过了200MS再执行 a();这个时候不会立即执行第二次，但是再过300MS以后
  // 会执行。而 debounce 是，第二次会重新计算等待时间，过 500MS才会执行。
  // 再比如给 window.onscroll 绑定一个方法， throttle 会在滚动的时候隔一段时间执行一次，
  // 而 debounce 不会执行，直到滚动停止，并且延迟时间过去。
  // 还有一个 immediate 参数，如果设置为 true，则先执行 func 再进行 timeout 计算，
  // 设置为 false，直到 timeout 结束才进行计算
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      // later方法，用于清除 timeout，以判断是否可以执行 func
      var later = function() {
        timeout = null;
        // 如果设置了 immediate 参数，函数函数运行的时候已经执行了 func
        // timeout 中就不需要执行了
        if (!immediate) result = func.apply(context, args);
      };
      // 判断先执行 func 还是 timeout 结束以后再执行 func
      var callNow = immediate && !timeout;
      // 重新计算时间间隔
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      // 设置了 immediate 会先执行 func
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  // 把 func 设置为只执行一次，很简单
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  // ... 把 func 绑定到 wrapper 的第一个参数中
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  // 接受 n 个 function，从后向前依次执行，并把后面的执行结果当做参数传给
  // 前面的函数...
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      // 从后向前执行函数
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  // 把一个 function 设置 n 次执行以后失效..
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  // ES5 的 keys，对不支持的浏览器用自己的方式实现 
  _.keys = nativeKeys || function(obj) {
    // 判断是不是 Object 实例化或者继承自 Object 的对象
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    // for ... in ... 读取 key
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  // 读取 obj 的 values，放到一个数组里
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  // 把 obj 转换成 [ [ Key, Value], [ Key, Value ] ... ] 的格式
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  // 创建一个新对象，把 obj 的属性和值对换存到新对象里
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  // 对 obj 的 function 名字进行排序
  _.functions = _.methods = function(obj) {
    var names = [];
    // 把 function 的名字从 obj 中取出来
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    // 哎玛，原来 sort 直接就能排序，不用 charCodeAt...
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  // 扩展一个对象 ( 没有深度拷贝 )
  _.extend = function(obj) {
    // slice.call( arguments, 1 ) 把参数从第2个到最后一个整合为一个数组
    // 用 each 为每个 obj 都赋值..
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  // 根据传进的参数返回一个新 object..
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
   // 跟 pick 相反，返回一个不包含传进的参数的对象
  _.omit = function(obj) {
    var copy = {};
    // 把传进的数组连接
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  // 跟 extend 差不多，但是假如原 obj 已经有相应的属性， extend 
  // 会覆盖属性， defaults 不会覆盖，就像名字那样，这个方法是用来设置默认值的
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  // 浅拷贝对象
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  // 为了在 chain 方法中向两个连写函数中间插入函数， underscorejs.org 的例子
  // _.chain([1,2,3,200])
  //  .filter(function(num) { return num % 2 == 0; })
  //  .tap(alert)
  //  .map(function(num) { return num * num })
  //  .value();
  // => // [2, 200] (alerted)
  // => [4, 40000]
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  // 判断是否相等
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    // 0 === -0，这都能找到.... 
    // 1 / 0 != 1 / -0 ....
    // 这句主要是判断 a === b，如果是 0，再做 1 / a == 1 / b 判断 0 和 -0 这种情况
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    // 判断 null 和 undefined
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    // 判断是不是 underscore 类型的对象
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    // 用 toString 判断类型，如果类型不一样，直接返回 false
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    // 根据 className 分情况判断
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        // 如果 a 是 String 类型，把 b 转换为 String 再做判断
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        // 依次判断 NaN, 0 和 -0，正常数字
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        // Date 和 Boolean 转换成 Number 进行判断
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        // 正则判断源码和三个属性
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    // 基本类型都判断完了，还剩 Array, Object, Function..
    // 用 typeof 把 function 剔除掉
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      // 用于判断类数组中 a 的下标在 bStack 中是否与 b 相等
      // aStack = [ 1, 3, 4 ], bStack = [ 2, 4, 5] 如果 a = 3, b = 4， 会返回 true
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    // 如果在 aStack 中没找到 a，把 a,b 分别 push 进栈
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    // 如果是 Array
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      // 先判断 a 和 b的长度是否相等
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        // 通过递归深度判断 Array 的每一个值
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    // 只剩 obj 没判断了，貌似
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      // 先判断构造器类型，如果构造器类型不一样，就返回 false
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      // 递归判断每一个 own 属性
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      // 判断是不是所有属性都判断完了
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        // 如果所有属性都相等， size 应该是 0
        // result 为 true
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  // 深度判断两个元素是否相等
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  // 判断一个元素是否是空的
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    // 先判断 Array 和 String
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    // 如果 obj 有 own 的属性，就返回 false
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  // 用 nodeType 判断是不是 HTMLElement
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  // 判断是不是 Array
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  // 判断是不是由 Object 派生的对象，
  // 除了 5 种基本类型，其它都属于 Object 派生的，包括 Function,Object,Array,Date.....
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  // 利用 Object.prototype.toString 判断下面这些类型，把相应的方法添加到 '_' 里
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  // 据原注释说 IE, ahem 中没有 [object Arguments] 类型，只能通过  callee 属性判断是不是
  // arguments 对象
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  // 好像有的浏览器中 typeof /./ === 'function' 结果是 true ...
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  // 是不是有上限的数字
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  // 判断是不是 NaN， NaN === NaN 结果是 false
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  // 判断是不是 Boolean 类型
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  // 是不是 Null
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  // 是不是 undefined
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  // 判断 key 是否是一个 obj 的属性..
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  // 把 _ 还原成原来的值
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  // 没有什么意思，为了某些方法必须要传一个 function, so..
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  // 执行 n 次 iterator，把结果保存在 accum 中
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  // 包装下 Math.random 方法，原生的比较难用
  _.random = function(min, max) {
    // 先判断 max 是不是没定义的值
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    // HTML 转义的 HashMap
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  // 把 escape 的属性和值对换
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  // 创建相关的正则
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  // 添加 escape 和 unescape 方法
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      // 通过正则替换文本内容
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  // 如果是 funcion 就执行，否则直接返回
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  // 向 underscore 的原型中添加自定义方法
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  // 定义不同的 id, 用闭包保存一个 id，再通过相加保证每个 id 都不一样
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  // ...模板的相关正则，用于匹配出 <% %> 中的代码 
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  // 这个正则什么都不会匹配
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  // 一些空白字符和'的转义 HashMap
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  // 上面的正则。。
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // 模板函数
  _.template = function(text, data, settings) {
    var render;
    // 模板设置，创建一个新 object 把 settings 放进去并把默认设置也放进去..
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    // 把正则整合到一起
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    // 因为 matcher 有三个号括，所以匹配的结果依此为  表达式匹配值，子表达式 escape，
    // 子表达式 interpolate，子表达式 evaluate，和 表达式的起始位置
    // 经过这个正则后， source 会处理为一段可执行的代码。
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      // 把上次匹配结束字符(下标为 index ) 到本次匹配开始字符 ( 下标 offset) 中间的
      // 空白字符转义，并放到 source 中
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      // 处理 <%- ... -%> 中间的字符，放到 escape 中
      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      // 处理 <%= ... %> 中间的字符，放到 escape 中
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      // 处理 <% ... %> 中间的字符，放到 escape 中
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    // 判断是不是需要用到 with 语句
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    // 继续处理 source，添加 print 方法
    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      // new 一个函数，函数内容是之前拼接好的字符串
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    // 给 new 出来的函数传值，返回数据
    if (data) return render(data, _);
    // 如果没传 data，则把这个函数保存起来做为返回值返回.
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  // 通过 _.chain() 包装的对象能够像 jQuery 那样的方式连写
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  // 如果支持链接操作返回 underscore 对象，不支持则返回被包装的对象   
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  // 把_.* 放到 _.prototype 里，以便能够通过构造函数创建 underscore 对象
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  // 把数组的一些方法添加到被包装的对象中  _wrapped 指的是通过 _( obj ) 方式传进的对象
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  // 作用同上，只不过这些方法会返回一个新的 obj
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    // 用于连续调用，设置 _chain 为 true，表示当前对象支持链式操作
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    // 返回 underscore 对象所包含的对象，类似  jQuery 对象和 dom 元素的关系
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

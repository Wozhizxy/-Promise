/**
 * 手写Promise
 */

class MyPromise {
  static pending = "pending";
  static fufilled = "fufilled";
  static rejected = "rejected";

  static resolve = (value) => {
    if (value instanceof MyPromise) {
      return value;
    }
    return new MyPromise((resolve, reject) => {
      resolve(value);
    });
  };

  /**注意 reject 没有 resolve 的幂等性 如果传入的理由是一个期约，该期约会称为拒绝的理由 */
  static reject = (reason) => {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    });
  };

  /**   all  全部解决则解决 一个拒绝则拒绝  */
  static all(...promises) {
    //利用promise的状态只能改变一次
    //1个pending 则全pending
    let results = [];
    return new MyPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then(
          (val) => {
            results.push(val);
            if (results.length === promises.length) resolve(results);
          },
          (reason) => {
            reject(reason);
          }
        );
      });
      //没有拒绝  然后怎么判断有没有pending状态的？ 根据result的length!
    });
  }

  static race(...promises) {
    //最先落定则落定，最先失败则失败
    return new MyPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then(
          (val) => {
            resolve(val);
          },
          (reason) => {
            reject(reason);
          }
        );
      });
    });
  }

  callbacks = {
    onfulfilled: [],
    onrejected: [],
  };
  constructor(excutor) {
    this.status = MyPromise.pending;
    excutor(this.resolve, this.reject);
  }
  resolve = (value) => {
    if (this.status === MyPromise.pending) {
      this.status = MyPromise.fufilled;
      this.value = value;
      //发布事件  加入任务队列 而非立即执行   利用箭头函数保存this的值。
      setTimeout(() => {
        this.callbacks.onfulfilled.forEach((callback) => callback(value));
      });
    }
  };
  reject = (reason) => {
    if (this.status === MyPromise.pending) {
      this.status = MyPromise.rejected;
      this.reason = reason;
      //发布事件
      setTimeout(() => {
        this.callbacks.onrejected.forEach((callback) => callback(reason));
      });
    }
  };
  /**
   *
   * @param {*} onfulfilled
   * @param {*} onrejected
   * @return {Promise}
   * then 返回解决的期约对象，若回调函数有返回值，则值或理由为该返回值
   * 若回调函数执行出错，则返回拒绝的期约，理由为该错误
   * 期约在传入的函数执行后进入落定状态
   * 如果onfufilled为undefined 则返回一个解决的期约 且值为自己的值 Promise.resolve包装自己的value
   * 如果回调函数为Promise对象，则then的返回值为该对象
   * 这里采用的方法是： callback().then(resolve, reject) 来
   */
  then = (onfulfilled, onrejected) => {
    //helper
    function parse(promise, resolve, reject, callback, value) {
      let result;
      try {
        result = callback(value);
      } catch (error) {
        reject(error);
      }
      if (result === promise) {
        throw TypeError(
          "error happened :) Chaining cycle detected for MyPromise #<MyPromise>"
        );
      }
      if (result instanceof MyPromise) {
        result.then(resolve, reject);
      } else {
        resolve(result);
      }
    }

    //首先把两个参数变成函数   返回值这样设置以实现then的穿透 只要传入的不是函数，就视为没有传入。
    if (typeof onfulfilled !== "function") onfulfilled = () => this.value;
    if (typeof onrejected !== "function") onrejected = () => this.reason;
    //返回一个Promise对象
    let promise = new MyPromise((resolve, reject) => {
      if (this.status === MyPromise.fufilled) {
        setTimeout(() => {
          parse(promise, resolve, reject, onfulfilled, this.value);
        });
      } else if (this.status === MyPromise.rejected) {
        setTimeout(() => {
          parse(promise, resolve, reject, onrejected, this.reason);
        });
      } else if (this.status === MyPromise.pending) {
        //处理fufilled的情况， 观察者模式
        this.callbacks.onfulfilled.push((value) => {
          parse(promise, resolve, reject, onfulfilled, value);
        });
        this.callbacks.onrejected.push((reason) => {
          parse(promise, resolve, reject, onrejected, reason);
        });
      }
    });
    return promise;
  };
}

/** test then function */
// let p = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve("value.");
//     console.log("i'm before the value ^.^.");
//   }, 1000);
// });
// p.then()
//   .then((value) => value + "then once!")
//   .then((val) => console.log(val))
//   .then(() => {
//     return new MyPromise((resolve, reject) => {
//       setTimeout(() => {
//         resolve(
//           "now in then function i return a promise and i can get its value ^.^"
//         );
//       });
//     });
//   }, null)
//   .then((val) => console.log(val));
// console.log("I will be printed first.");

// let p2 = new MyPromise((resolve, reject) => {
//   resolve("value.");
// });

/** tests resolve*/
// let p3 = p2.then(() => p3);
// let p3 = new MyPromise((resolve, reject) => {
//   resolve();
// });
// console.log(MyPromise.resolve(p3) === p3);

/** tests race all */
// let p4 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve("val4");
//   }, 1000);
// });
// let p5 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject("reason5");
//   }, 2000);
// });
// let p6 = MyPromise.race(p4, p5);
// let p7 = MyPromise.all(p4, p5);
// setTimeout(() => {
//   console.log(p6, p7);
// }, 3000);

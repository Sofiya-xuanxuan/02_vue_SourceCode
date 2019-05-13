//期待用法
// new KVue({
//     data:{msg:'hello'}
// })

class KVue {
    constructor(options) {
        this.$options = options;

        //将data取出来
        this.$data = options.data;
        //对data数据进行劫持
        this.observe(this.$data);

        // new Watcher();
        // this.$data.test;
        // new Watcher();
        // this.$data.foo.bar;
        new Compile(options.el,this);//this表示将当前实例传进去
        if(this.$options.created) {
            this.$options.created.call(this);
        }
    }

    observe(value) {
        //对value做判断
        if (!value || typeof value !== 'object') {//value不存在或者格式不是对象的情况下，直接返回即可
            return;
        }
        Object.keys(value).forEach(key => {
            this.defineReactive(value, key, value[key]);
            //对data中的数据进行代理，方便用户访问：this.test,而不是this.$data.test
            this.proxyData(key);
        })
    }

    //代理
    proxyData(key) {
        //这里的this就是new KVue的实例
        Object.defineProperty(this, key, {
            get() {
                return this.$data[key]
            },
            set(newVal) {
                this.$data[key] = newVal;
            }
        })
    }

    defineReactive(obj, key, val) {
        const dep = new Dep();
        Object.defineProperty(obj, key, {
            get() {
                Dep.target && dep.addDep(Dep.target)//将watcher存放到dep数组中
                return val
            },
            set(newVal) {
                if (newVal !== val) {
                    val = newVal;
                    dep.notify();//通知数据发生变化
                }
            }
        })
        //递归
        this.observe(val)//对象深层嵌套就需要递归继续监听
    }
}

//依赖收集与追踪
//一个可以就有一个dep
class Dep {
    constructor() {
        this.deps = []//用于存放多个watcher
    }

    addDep(dep) {
        this.deps.push(dep)
    }

    notify() {
        this.deps.forEach(dep => dep.update())
    }
}

//watcher
class Watcher {
    constructor(vm,key,cb) {
        this.vm=vm;
        this.key=key;
        this.cb=cb;
        Dep.target = this;//将watcher自己赋给Dep.target，稍后会用到
        this.vm[this.key]//读一下，触发get
        Dep.target=null;//然后置空，怕影响别的
    }

    update() {
        this.cb.call(this.vm,this.vm[this.key])
    }
}
//期待用法
//new Compile(el,vm);

class Compile{
    constructor(el,vm){
        this.$el=document.querySelector(el);
        this.$vm=vm;
        if(this.$el) {
           //提取宿主中模板内容到Fragment标签，这样会提高效率
           this.$fragment=this.node2Fragment(this.$el);
           //进行编译
            this.compile(this.$fragment);
            //编译成浏览器能识别的内容后，再插入宿主标签中
            this.$el.appendChild(this.$fragment)
        }
    }
    node2Fragment(el){
        const fragment=document.createDocumentFragment();
        let child;
        while(child=el.firstChild){//将el下的每个节点都赋给child，然后移到新建的fragment中去
            fragment.appendChild(child);
        }
        //移完以后，返回fragment
        return fragment;
    }
    //编译——注意是否是节点还是文本，节点上特殊的指令要去注意
    compile(el){
        //文档里几乎每一样东西都是一个节点，甚至连空格和换行符都会被解释成节点。而且都包含在childNodes属性所返回的数组中。
        // chidNoeds返回的事node的集合，每个node都包含有nodeType属性。
        // nodeType取值：
        // 元素节点：1
        // 属性节点：2
        // 文本节点：3
        // 注释节点：8
        const childNodes=el.childNodes;//childNodes 属性返回节点的子节点集合

        //遍历子节点
        Array.from(childNodes).forEach(node=>{
            //判断节点类型
            if(node.nodeType==1) {//元素节点
                //console.log('编译元素节点'+node.nodeName);
                this.compileElement(node)//编译元素节点
            }else if(this.isInterpolation(node)) {
                //插值表达式
                //console.log('编译插值表达式'+node.textContent);
                this.compileText(node)//编译文本节点
            }
            //递归子节点
            if(node.childNodes && node.childNodes.length>0) {//如果子节点下面还有子节点，则继续编译
                this.compile(node);
            }
        })
    }
    //判断是否是插值表达式
    isInterpolation(node){
        //是文本节点，并且符合正则{{}}
        return node.nodeType==3 && /\{\{(.*)\}\}/.test(node.textContent)//node.textContent是文本的内容{{name}}
    }
    //编译元素节点
    compileElement(node) {
        //关心属性<div k-text="text" @click=""></div>
        let nodeAttrs=node.attributes;//获取元素节点上的所有属性
        Array.from(nodeAttrs).forEach(attr=>{
            const attrName=attr.name;
            const exp=attr.value;
            if(this.isDirective(attrName)) {
                const dir=attrName.substring(2);//取的是k-之后的text
                //取完之后去执行编译
                this[dir] && this[dir](node,this.$vm,exp,dir);
            }
            if(this.isEvent(attrName)) {
                const dir=attrName.substring(1);//取的是@之后的click
                //取完之后去执行编译
                this.eventHandler(node,this.$vm,exp,dir);
            }
        })

    }
    //判断是否是指令
    isDirective(attrName){
        return attrName.indexOf('k-')===0;
    }
    //判断是否是事件
    isEvent(attrName){
        return attrName.indexOf('@')===0;
    }
    //编译文本节点
    compileText(node){
        //RegExp.$1：分组匹配的第一部分，其实就相当于key
        //RegExp.$1表达式    'text'当前操作类型（指令类型、事件类型等等）
        //this.$vm[RegExp.$1]这边相当于是this.name，为什么可以这么取，因为之前对data中的数据做了代理
        this.update(node,this.$vm,RegExp.$1,'text')//表示更新文本类型
    }
    //更新函数
    update(node,vm,exp,dir){
        let updaterFn=this[dir+'Updater'];
        updaterFn && updaterFn(node,vm[exp]);//将文本的值传过去
        //依赖收集——这里之所以要依赖收集，是因为视图中用到了
        new Watcher(vm,exp,function(value){
            updaterFn && updaterFn(node,value);
        })

    }
    //文本更新
    textUpdater(node,val){
        node.textContent=val;//将值直接赋给文本
    }
    //事件编译
    eventHandler(node,vm,exp,dir){
        //取到methods中的函数
        const fn=vm.$options.methods[exp];
        if(dir && fn) {
            node.addEventListener(dir,fn.bind(vm));
        }
    }
    //文本编译
    text(node,vm,exp,dir){
        this.update(node,vm,exp,dir)//表示更新文本类型
    }
    //实现双向绑定k-model
    model(node,vm,exp,dir){
        //date——>view的更新
        this.update(node,vm,exp,dir);
        //view——>data的更新
        node.addEventListener('input',e=>{
            vm[exp]=e.target.value;
        })
    }
    //k-html
    html(node,vm,exp,dir){
        node.innerHTML=vm[exp];//注意更新html的内容时是用的innerHTML
    }
}
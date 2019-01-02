/**
 * 定制版本
 * 1. 忽略JSX
 * 2. 临时使用jquery作为Dom操作节点
 */

/**
 * 1. commponent类，用来操作文本在渲染，更新，删除。。
 * @param {*} text 
 */
function ReactDOMTextComponent(text) {
  this._currentElement = '' + text
  this._rootNodeId = null
}

ReactDOMTextComponent.prototype.mountComponent = function (rootID) {
  this._rootNodeId = rootID
  return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>'
}

ReactDOMTextComponent.prototype.receiveComponent = function (nextText) {
  var nextStringText = '' + nextText
  if (nextStringText !== this._currentElement) {
    this._currentElement = nextStringText
    $('[data-reactid="' + this._rootNodeId + '"]').html(this._currentElement)
  }
}

/**
 * 2. commponent类，用来操作DOM节点元素
 * @param {*} element 
 */
function ReactDOMComponent (element) {
  this._currentElement = element
  this._rootNodeId = null
}

ReactDOMComponent.prototype.mountComponent = function (rootID) {
  // 赋值操作
  this._rootNodeId = rootID
  var props = this._currentElement.props
  var tagOpen = '<' + this._currentElement.nodeName
  var tagClose = '</' + this._currentElement.nodeName + '>'
  // 添加reactid标识
  tagOpen += ' data-reactid=' + this._rootNodeId

  // 拼凑出属性id, class, name, title 等等。最重要的 event
  for (var propKey in props) {
    // 解析事件监听，从属性props中解析拿出on开头的事件属性的对应事件监听
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '')
      $(document).delegate('[data-reactid="' + this._rootNodeId + '"]', eventType + '.' + this._rootNodeId, props[propKey])
    }

    // 对于children属性以及事件监听的属性不需要
    if (props[propKey] && propKey != 'children' && !/^on[A-Za-z]/.test(propKey)) {
      tagOpen += ' ' + propKey + '=' + props[propKey];
    }
  }

  // 获取子节点渲染的内容
  var content = ''
  var children = props.children || []

  // 用于保存所有的子节点的componet实例
  var childrenInstances = []
  var that = this

  $.each(children, function(key, child) {
      //这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
      var childComponentInstance = instantiateReactComponent(child)
      childComponentInstance._mountIndex = key
      childrenInstances.push(childComponentInstance)
      //子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
      var curRootId = that._rootNodeId + '.' + key
      //得到子节点的渲染内容
      var childMarkup = childComponentInstance.mountComponent(curRootId)
      //拼接在一起
      content += ' ' + childMarkup
  })
  //留给以后更新时用的这边先不用管
  this._renderedChildren = childrenInstances

  // 返回整个html内容
  return tagOpen + '>' + content + tagClose
}

ReactDOMComponent.prototype.receiveComponent = function (nextElement) {

}

ReactDOMComponent.prototype._updateDOMProperties = function (lastProps, nextProps) {

}

ReactDOMComponent.prototype._updateDOMChildren = function (nextChildrenElements) {

}

// 差异更新的几种类型
var UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}

function flattenChildren (componentChildren) {

}

function generateComponentChildren () {

}

ReactDOMComponent.prototype._diff = function (diffQueue, nextChildrenElements) {

}

function insertChildAt (parentNode, childNode, index) {

}

ReactDOMComponent.prototype._patch = function (updates) {

}

/**
 * 3. component类，用来返回自定义元素渲染内容
 * @param {*} node 
 */
function ReactCompositeComponent (element) {
  // 存放元素element对象
  this._currentElement = element
  this._rootNodeId = null
  this._instance = null
}

ReactCompositeComponent.prototype.mountComponent = function (rootID) {
  this._rootNodeId = rootID
  var publicProps = this._currentElement.props
  var ReactClass = this._currentElement.nodeName
  var instance = new ReactClass(publicProps)
  this._instance = instance
  // 保留对当前component的引用，下面更新会用到
  instance._reactInternalInstance = this
  if (instance.componentWillMount) {
    // 原始的reactjs其实还有一层处理，就是componentWillMount调用setstate，不会触发rerender而是自动提前合并
    instance.componentWillMount()
  }
  // 调用ReactClass的实例render
  var renderedElement = this._instance.render()
  // 得到renderedElement对应的component类实例
  var renderedComponentInstance = instantiateReactComponent(renderedElement)
  this._renderedComponent = renderedComponentInstance; //存起来留作后用

  // 拿到渲染后的字符串内容
  var renderedMarkUp = renderedComponentInstance.mountComponent(this._rootNodeId)

  // 监听mountReady事件
  $(document).on('mountReady', function () {
    instance.componentDidMount && instance.componentDidMount()
  })
  return renderedMarkUp
}

ReactCompositeComponent.prototype.receiveComponent = function (nextElement, newState) {
  // 新的配置
  this._currentElement = nextElement || this._currentElement

  var instance = this._instance
  // 合并配置
  var nextState = $.extend(instance.state, newState)
  var nextProps = this._currentElement.props

  instance.state = nextState

  // 如果instance有shouldComponentUpdate,并且返回false，说明组件本身不需要更新，直接返回  优化点~
  if (instance.shouldComponentUpdate && instance.shouldComponentUpdate(nextProps, nextState) === false) return false

  // 生命周期 componentWillUpdate, 开始更新
  if (instance.componentWillUpdate) instance.componentWillUpdate(nextProps, nextState)

  var prevComponentInstance = this._renderedComponent

  var prevRenderedElement = prevComponentInstance._currentElement
  var nextRenderredElement = this._instance.render()

  // prev, next对比 判断是需要更新还是直接重新渲染
  if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderredElement)) {
    // 调用子节点的receiveComponent方法
    prevComponentInstance.receiveComponent(nextRenderredElement)
    // 调用componentDidUpdate标识更新完成
    instance.componentDidUpdate && instance.componentDidUpdate()
  } else {
    // @TODO 重新渲染
    var thisID = this._rootNodeId
    this._renderedComponent = this._instantiateReactComponent(nextRenderredElement)
    //重新生成对应的元素内容
    var nextMarkup = _renderedComponent.mountComponent(thisID);
    //替换整个节点
    $('[data-reactid=' + this._rootNodeID + ']').replaceWith(nextMarkup)
  }
}

// 用来判定两个element需不需要更新
// key不一致，直接返回false，重新渲染
var _shouldUpdateReactComponent = function (prevElement, nextElement) {
 if (prevElement !== null && nextElement !== null) {
  var prevType = typeof prevElement
  var nextType = typeof nextElement
  if (prevType === 'string' || prevType === 'number') {
    return nextType === 'string' || nextType === 'number'
  } else {
    return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key
  }
 }
 return false
}

// 4. component实例
function instantiateReactComponent(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactDOMTextComponent(node)
  }
  // 目前只支持几个元素
  if (typeof node === 'object' && typeof node.nodeName === 'string') {
    return new ReactDOMComponent(node)
  }

  // 自定义元素节点
  if (typeof node === 'object' && typeof node.nodeName === 'function') {
    return new ReactCompositeComponent(node)
  }
}

/**
 * 5. ReactElement 就是虚拟dom的概念
 * nodeName属性表示当前的节点类型，比如: 'div', 'a', 'span'
 * key可以标识element
 * 节点属性props (attributes或者props)
 */
function ReactElement(nodeName, key, props) {
  this.nodeName = nodeName
  this.key = key
  this.props = props
}

/**
 * 6. 定义ReactClass类，所有自定义的超级父类
 * render
 * setState
 */
function ReactClass () {}

ReactClass.prototype.render = function () {}

ReactClass.prototype.setState = function (newState) {
  this._reactInternalInstance.receiveComponent(null, newState)
}
/**
 * 7. 定义基础对象React
 * nextReactRootIndex 标记节点
 * createClass 生成继承类
 * createElement 生成元素
 * render函数
 */
var React = {
  nextReactRootIndex: 0,
  createClass: function (spec) {
    var ChildClass = function (props) {
      ReactClass.call(this)
      this.props = props;
      this.state = this.getInitialState ? this.getInitialState() : null
    }
    ChildClass.prototype = Object(ReactClass.prototype)
    ChildClass.prototype.constructor = ChildClass
    $.extend(ChildClass.prototype, spec)
    console.log(ChildClass)
    return ChildClass
  },
  createElement: function (nodeName, params, children) {
    var props = {}
    params = params || {}
    var key = params.key || null
    // 复制params中的内容到props
    for (var propName in params) {
      if (params.hasOwnProperty(propName) && propName !== 'key') {
        props[propName] = params[propName]
      }
    }
    // @TODO 处理children,全部挂载到props的children属性中
    var childrenLength = arguments.length - 2
    if (childrenLength === 1) {
      props.children = $.isArray(children) ? children : [children] 
    } else if (childrenLength > 1) {
      var childArray = Array(childrenLength)
      for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2]
      }
      props.children = childArray
    }
    return new ReactElement(nodeName, key, props)
  },
  render: function (element, container) {
    // 把text文字转换成组件，插入节点
    var componentInstance = instantiateReactComponent(element)
    var markup = componentInstance.mountComponent(React.nextReactRootIndex++)
    $(container).html(markup)
    // 触发渲染完mount的事件
    $(document).trigger('mountReady')
  }
}
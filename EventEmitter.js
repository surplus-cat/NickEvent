/**
 * @author nick 
 * @email 401541212@qq.com
 * @date 2018-3-4 
 * @version 1.0
 */
'us strict';
/**
 * @description 事件流程类，该类在事件的基础上改进加入了流程控制，并且支持同步与异步操作，通过依赖关系自动执行形成流程控制机制。
 * @constructor
 */
var NickEvents = function() {
	/**
	 * @type {Object} _this 当前对象
	 * @type {Object} __chains 保存任务链的对象
	 * @type {Object} __events 保存事件的对象
	 * @type {Object} __chainsRelation 保存任务链关系的对象
	 * @type {Number} _maxListeners 限制同一个事件最大支持多少个处理函数，默认值10个，如果设置为0表示不限制
	 * @type {Object} __eventsCount 统计每个事件的回调函数执行信息 结构： {事件类型： {count:执行次数,error:异常的执行次数}}
	 */
	var _this = this;
	var __events = {};
	var __chainsRelation = {};
	var __eventsCount = {};
	var _maxListeners = 10;
	/**
	 * @param {Boolean} once		设置绑定的回调函数可执行次数，默认值为false。true表示仅执行一次，false表示不限次数。
	 * @param {Boolean} prepend	设置绑定的事件是否插入事件列表头部，默认值为false。true表示向头部添加事件，false表示向尾部添加事件。
	 * @param {Boolean} define	设置绑定的事件是否为常量，如果为常量则无法通过事件移除方法删除常量事件，默认值为false。true表示事件不可移除，false表示事件可移除。
	 * @param {Number} chain		设置绑定的事件启用的流程控制方式，默认值为1。1表示顺序完成，2表示顺序且全成功，3表示顺序且全失败，4表示无序完成，5表示无序全成功，6表示无序全失败。
	 * @return {Function(eventName, chains, callback)}	返回事件绑定处理函数,该函数是偏函数写法以针对不同的事件绑定方式进行处理。
	 */
	var addListener = function(once, prepend, define, chain) {
		/**
		 * @param {String} eventName 事件类型名称
		 * @param {Function|Array} chains 第二参数如果是函数则是事件的回调函数，如果是数组则是事件的依赖任务链
		 * @param {Function} callback 绑定的回调函数
		 */
		return function(eventName, chains, callback) {
			/**
			 * @type {Object} _events 保存事件的对象，根据chain流程控制方式来选择，指定流程控制时存储在__chains上否则存储在__events上
			 * @type {Boolean} 判断chains参数是否是函数，未启用任务链模式时第二参数为回调函数，启用任务链时第二参数为任务链关系
			 */
			var _events = __events;
			var chainsIsFunction = typeof chains == 'function';
			if(chainsIsFunction) callback = chains;
			if(eventName && typeof callback == 'function') {
				/**
				 * @type {Array} events 根据事件类型获取事件列表
				 * @type {Array} callback 回调函数数组，回调函数以数组形式保存因为还需要保存其它参数条件 在执行时候同时取出其它条件
				 */
				if(!_events[eventName]) _events[eventName] = [];
				var events = _events[eventName];
				var callback = [callback, once, define, chain];
				// 当chains参数不是回调函数时才将chains任务链插入回调函数数组
				if(!chainsIsFunction) callback.push(chains);
				//任务链关系列表必须为数组格式
				if(chains && {}.toString.call(chains).slice(8,-1) == 'Array'){
					//复制任务链关系数组防止引用操作破坏原有数据
					chains = chains.slice();
					/**
					 * @type {Object} chainsIndex 任务链关系索引对象 以任务链为key不重复保存任务关系减少遍历
					 * @type {String} chainsKey 将任务链数组转换成字符串并作为属性名使用
					 */
					var chainsIndex = {};
					var chainsKey = chains.join(); 
					//遍历任务链链表并将任务链名称进行缓存存储到chainsIndex
					chains.forEach(function(v){
						chainsIndex[v] = 1;
					});
					/**
					 * @property {Array} chains.queue 保存任务链执行结果的数组队列
					 * @property {Number} chains.count 保存任务链队列执行的成功次数 用于判断任务链是否全部成功执行
					 */
					chains.queue = [];
					chains.count = 0;
					//在任务链关系对象中以事件名称为属性，一个事件可能有多个任务链关系以数组形式保存
					if(!__chainsRelation[eventName]) __chainsRelation[eventName] = {};
					// 将任务链关系数组及任务链关系索引对象存储在 任务链关系对象中
					__chainsRelation[eventName][chainsKey] = [chains, chainsIndex];
				}
				//如果指定了事件回调函数的长度并且大于最大长度限制，绑定了error事件则执行error事件交由用户自己处理否则抛出异步
				if(_maxListeners && events.length >= _maxListeners) {
					var errorMsg = 'the listeners length > maxListeners';
					if(_events.error) {
						_this.emit('error', errorMsg);
					} else {
						throw errorMsg;
					}
				} else {
					//如果prepend为true则向数组头部插入否则默认将事件回调函数追回到尾部
					prepend ? events.unshift(callback) : events.push(callback);
				}
			}
			return _this;
		}
	};
	/**
	 * 
	 * @param {Boolean} removeAll 布尔值是否执行全部删除，true为全部删除,false为删除单个，但不会删除常量的回调函数
	 * @param {Number} chain 数值类型，如果值为真则从任务链对象中删除，否则从普通事件中删除
	 */
	var removeListener = function(removeAll) {
		return function(eventName,listener){
			var _events =  __events;
			var events = _events[eventName] || [];
			var index = 0;
			var length = events.length;
			var removeCount = 0;
			var value;
			for(; index < length; index++){
				value = events[index];
				//事件列表中的回调函数为数组格式  [callback,once,define,chain...]
				var callback = value[0];
				var defined = value[2];
				//如果事件的回调函数不是常量，并且 全部删除为真或回调函数等于listener 即将当前回调函数删除
				if(!defined && (removeAll ? true : callback === listener)){
					events.splice(index,1);
					index--;
					length--;
					removeCount++;
				}
			}
			//如果事件内的所有回调函数都被删除 清理该事件的相关数据
			if(removeCount == length) {
				_events[eventName] = null;
				__chainsRelation[eventName] = null;
				__eventsCount[eventName] = null;
			}
		}
	};
	/**
	 * 
	 * @param {Number} n 整数非负，设置事件最多可以绑定多少个回调函数
	 */
	var setMaxListeners = function(n) {
		_this.maxListeners = _maxListeners = isNaN(n - 0) ? _maxListeners : n - 0;
	};
	/**
	 * @description 事件监听函数，当一个事件中所有的回调函数都执行完成时才会触发此函数，并且通知此函数事件的执行结果，总共多少个事件，有多少成功，有多少失败以便进行其它逻辑处理
	 * @param {String} eventName 事件类型名称
	 * @param {Number} count 当前事件一共有多少个回调函数
	 * @param {Number} success 当前事件有多少个回调函数是成功的
	 * @param {Number} error   当前事件有多少个回调函数是失败的
	 */
	var listening = function(eventName, count, success, error){
		//每一组事件的完成都将触发该回调函数并且遍历任务链关联关系以检测任务链中的关系是否匹配，如果匹配则会触发执行
		for(var type in __chainsRelation){
			//遍历任务链关系数组 
			for(var i in __chainsRelation[type]){
				/**
				 * @type {Array} chains 关联关系数组结构 数组中第一个元素为关联关系数组，第二个元素为关联关系索引数组
				 * @type {Object} chainsIndex 关联关系索引对象 用于快速判断当前事件是否在任务链中
				 * @type {Number} length 获取任务链长度
				 * @type {String} first 获取第一个任务名称
				 * @type {String} last 获取最后一个任务名称
				 */
				var chains = __chainsRelation[type][i];
				var chainsIndex = chains[1];
				chains = chains[0];
				var length = chains.length;
				//如果当前的事件名称在任务链索引对象中则执行处理 比如任务链是{a:1,b:1,c:1} 当前的事件若是a或b则在任务链索引中存在 
				if(chainsIndex[eventName]){
					//将当前的事件存储到任务链队列中，当任务全部完成时比较队列中的任务执行顺序与任务链的顺序是否一致，以判断是顺序执行还是非顺序执行
					chains.queue.push(eventName);
					//如果当前事件的失败回调函数为0 chains.count则+1 如果任务链全部执行完成并且chains.count值等于任务链长度表示所有任务均全部成功执行
					if(!error) chains.count++;
					/**
					 * @type {String} sortChains 将任务链数组排序并且拼接成字符串以便进行比较
					 * @type {String} sortQueue 将任务链执行的队列数组排序并拼接成字符串以便进行比较
					 */
					var sortChains = chains.slice().sort().join();
					var sortQueue = chains.queue.slice().sort().join();
					//if(type == 'test')console.log(chains.queue,eventName,type)
					//如果任务链执行队列长度大于等于任务链数组长度表示任务链执行完成
					if(chains.queue.length >= length ){
						//如果任务链与执行的队列相等表示 任务链完成且匹配成功，统一排序的比较只是表示任务链中的任务相同但不表示执行顺序
						if(sortChains == sortQueue){
							/**
							 * @type {Boolean} isQueue 布尔值判断执行队列与任务链是否相等如果相待表示是顺序执行，否则为无序执行
							 * @type {Boolean} chainAll 布尔值 判断任务链接是否全部成功执行，如果任务链成功执行的计数等于任务链长度表示全部成功执行
							 * @type {Boolean} chainError 布尔值  如果任务链成功执行计算为0 则表示任务链全部执行失败
							 * @type {Number} chainType 数值用于表示任务链的执行类型
							 *  1 顺序全完成   2 顺序全成功  3 顺序全失败
							 *  3 无序全完成   5 无序全成功  6 无序全失败
							 * 如果isQueue为真则表示顺序执行否则为无序执行
							 * 
							 */
							var isQueue = chains.join() == chains.queue.join();
							var chainAll = chains.count == length;
							var chainError = !chains.count;
							var chainType;
							if(isQueue){
								//如果是顺序执行，全部成功为2  全部失败为3  否则为1
								chainType = chainAll ? 2 : chainError ? 3 : 1;
							}else{
								//如果是无序运行  全部成功为5 全部失败为6  否则为4
								chainType = chainAll ? 5 : chainError ? 6 : 4;
							}
							//如果全部成功或全部失败强制执行全部完成任务，如果是顺序执行全部完成值为1 无序全部完成值为4
							if (chainAll || chainError) emit(true, isQueue, sortChains, isQueue ? 1 : 4 ).call(_this,type);
							//调用任务链事件 
							emit(true, isQueue, sortChains, chainType).call(_this,type);
						}
						//任务链完成还原初始化 重新计数并清理队列
						chains.queue = [];
						chains.count = 0;
					}
				}
			}
		}
	};
	/**
	 * @description 事件执行函数
	 * @param {Boolean} isChain 是否是任务链事件
	 * @param {Boolean} isQueue 是否是顺序执行
	 * @param {String} sortChains 排序后的任务链字符串
	 * @param {Number} chainType 流程控制方式 数值类型
	 * @return {Function(eventName)} 返回事件处理函数 偏函数写法根据不同的条件来执行不同的事件处理
	 */
	var emit = function(isChain, isQueue, sortChains, chainType){
		return function(eventName){
			/**
			 *@type {Object} _events 保存事件的对象 
			 * @type {Array} events 取出指定的事件回调函数列表
			 * @type {Array} arg 调用事件时传递进来的其它参数列表强制转换为数组
			 * @type {Number} index 初始化索引值
			 * @type {Number} length 事件列表长度
			 * @type {Array} value 回调函数数组 [callback,once,define....]
			 * @type {Number} count 统计事件完成的数量
			 * @type {Number} error 统计事件失败的数量
			 */
			if(!__eventsCount[eventName]) __eventsCount[eventName] = {count:0,error:0};
			var _events = __events;
			var events = _events[eventName] || [];
			var arg = [].slice.call(arguments,1);
			var index = 0;
			var length = events.length;
			var value;
			var eventsCount = __eventsCount[eventName];
			/**
			 * @description 每一个事件的回调函数中的第一个参数为next函数，当执行next回调的时候就会触发回调函数执行统计
			 * 如果希望准确的知道有多少个事件完成，有多少事件成功或失败必须执行此next函数，参数为布尔值，若为真则表示回调函数执行失败
			 * 任务链执行依赖此函数来统计事件的执行情况！
			 * @param {Boolean} isError 判断事件执行是否失败
			 */
			var next = function(isError){							
				//无论回调函数执行成功或失败都计数+1
				eventsCount.count++;
				//当执行失败时失败计数+1
				if(isError) eventsCount.error++;
				//当执行数大于等于事件列表长度时表示该事件类型下的回调函数都执行完毕 然后触发listening回调函数
				if(eventsCount.count >= length){
					var count = eventsCount.count;
					var error = eventsCount.error;
					__eventsCount[eventName] = {count:0,error:0};
					//为了防止修改以及执行优先性将任务链执行逻辑通过listening回调函数完成
					//由于先执行的emit事件用户操作完成才调用next导致在listening阶段对数组的关联队列操作出现提前的问题，因此要延迟执行保证队列执行顺序正常
					setTimeout(function(){
					//触发listening事件 并将事件的执行结果传递
					_this.emit('listening', eventName, count, count - error, error);
						listening(eventName, count, count - error, error);
					})
				}
			};
			//listeing事件不提供next统计方法 防止进入列循环，且listeing只供监听不能作为任务链进行统计调用
			if(eventName != 'listening')arg.unshift(next);
			//遍历事件列表
			for(; index < length; index++){
				value = events[index];
				var callback = value[0];
				var once = value[1];
				var chain = value[3];
				//如果当前事件为任务链 并且回调函数数组中有任务链关系数组
				if(isChain && value[4]){	
					//如果当前的流程方法与chainType不匹配 或者 当前的任务链与排序后的任务链不匹配则跳过此循环不会触发该事件
					if(chain != chainType || value[4].slice().sort().join() != sortChains){
						continue;
					}
				}
				//执行事件回调函数并传递参数
				callback.apply(_this,arg);
				//如果当前的事件类型为只执行一次 将当前事件从列表中删除，并且将length index均-1 防止遍历异步
				if (once) {
					events.splice(index,1);
					index--;
					length--;
				}
			}
		}
	};
	_this.on = addListener(false, false, false, false);
	_this.chain = addListener(false, false, false, 1);
	_this.chainAll = addListener(false, false, false, 2);
	_this.chainError = addListener(false, false, false, 3);
	_this.chainAsync = addListener(false, false, false, 4);
	_this.chainAsyncAll = addListener(false, false, false, 5);
	_this.chainAsyncError = addListener(false, false, false, 6);
	_this.once = addListener(true, false, false, false);
	_this.chainOnce = addListener(true, false, false, 1);
	_this.chainAllOnce = addListener(true, false, false, 2);
	_this.chainErrorOnce = addListener(true, false, false, 3);
	_this.chainAsyncOnce = addListener(true, false, false, 4);
	_this.chainAsyncAllOnce = addListener(true, false, false, 5);
	_this.chainAsyncErrorOnce = addListener(true, false, false, 6);
	_this.addListener = addListener(false, false, false, false);
	_this.removeListener = removeListener(false);
	_this.removeAllListeners = removeListener(true);
	_this.defineOn = addListener(false, false, true, false);
	_this.defineChain = addListener(false, false, true, 1);
	_this.defineChainAll = addListener(false, false, true, 2);
	_this.defineChainError = addListener(false, false, true, 3);
	_this.defineChainAsync = addListener(false, false, true, 4);
	_this.defineChainAsyncAll = addListener(false, false, true, 5);
	_this.defineChainAsyncError = addListener(false, false, true, 6);
	_this.prependDefine = addListener(false, true, true, false);
	_this.prependDefineChain = addListener(false, true, true, 1);
	_this.prependDefineChainAll = addListener(false, true, true, 2);
	_this.prependDefineChainError = addListener(false, true, true, 3);
	_this.prependDefineChainAsync = addListener(false, true, true, 4);
	_this.prependDefineChainAsyncAll = addListener(false, true, true, 5);
	_this.prependDefineChainAsyncError = addListener(false, true, true, 6);
	_this.prependOn = addListener(false, true, false, false);
	_this.prependChain = addListener(false, true, false, 1);
	_this.prependChainAll = addListener(false, true, false, 2);
	_this.prependChainError = addListener(false, true, false, 3);
	_this.prependChainAsync = addListener(false, true, false, 4);
	_this.prependChainAsyncAll = addListener(false, true, false, 5);
	_this.prependChainAsyncError = addListener(false, true, false, 6);
	_this.prependOnce = addListener(true, true, false, false);
	_this.prependChainOnce = addListener(true, true, false, 1);
	_this.prependChainAllOnce = addListener(true, true, false, 2);
	_this.prependChainErrorOnce = addListener(true, true, false, 3);
	_this.prependChainAsyncOnce = addListener(true, true, false, 4);
	_this.prependChainAsyncAllOnce = addListener(true, true, false, 5);
	_this.prependChainAsyncErrorOnce = addListener(true, true, false, 6);
	_this.setMaxListeners = setMaxListeners;
	_this.maxListeners = _maxListeners;
	_this.emit = emit();
}
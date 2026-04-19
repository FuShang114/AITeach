/**
 * 学习路径规划工具
 * 创建个性化学习计划和路径
 */
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

// 学科配色映射
const SUBJECT_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  'python': { icon: '🐍', color: '#1cb0f6', bg: '#e0f2fe' },
  'javascript': { icon: '⚡', color: '#f59e0b', bg: '#fef3c7' },
  '数据结构': { icon: '🌳', color: '#10b981', bg: '#d1fae5' },
  '算法': { icon: '🧮', color: '#8b5cf6', bg: '#ede9fe' },
  '数据库': { icon: '🗄️', color: '#ef4444', bg: '#fee2e2' },
  '机器学习': { icon: '🤖', color: '#06b6d4', bg: '#cffafe' },
  'go': { icon: '🌐', color: '#00add8', bg: '#e0f7fa' },
};

// 学科课程内容数据库
const SUBJECT_CONTENT: Record<string, Record<string, Array<{ title: string; duration: string; points: string[]; summary: string }>>> = {
  python: {
    '基础入门': [
      { title: 'Python 环境搭建与第一个程序', duration: '30分钟', points: ['安装 Python 解释器', '配置开发环境', '编写 Hello World'], summary: '搭建 Python 开发环境，编写并运行第一个 Python 程序。' },
      { title: '变量与数据类型', duration: '45分钟', points: ['数字类型 int/float', '字符串 str', '布尔类型 bool', '类型转换'], summary: '掌握 Python 的基本数据类型及其使用方法。' },
      { title: '运算符与表达式', duration: '30分钟', points: ['算术运算符', '比较运算符', '逻辑运算符', '赋值运算符'], summary: '学习 Python 中各种运算符的使用和表达式的求值。' },
      { title: '字符串操作', duration: '45分钟', points: ['字符串索引与切片', '常用字符串方法', '格式化输出 f-string', '字符串拼接'], summary: '深入掌握字符串的各种操作技巧。' },
    ],
    '知识构建': [
      { title: '条件判断 if/elif/else', duration: '40分钟', points: ['if 语句', 'elif 多条件判断', '嵌套条件', '三元表达式'], summary: '学习条件判断语句，实现程序的分支逻辑。' },
      { title: '循环语句 for/while', duration: '45分钟', points: ['for 循环与 range', 'while 循环', 'break 与 continue', '循环嵌套'], summary: '掌握循环结构，实现重复执行逻辑。' },
      { title: '列表与元组', duration: '50分钟', points: ['列表创建与访问', '列表方法 append/pop/sort', '列表推导式', '元组的不可变性'], summary: '学习序列数据结构的创建和操作。' },
      { title: '字典与集合', duration: '45分钟', points: ['字典的键值对操作', '集合的交并差', '字典推导式', 'JSON 数据处理'], summary: '掌握映射和集合数据结构的使用。' },
    ],
    '能力提升': [
      { title: '函数定义与参数', duration: '50分钟', points: ['def 定义函数', '位置参数与关键字参数', '默认参数', '*args 和 **kwargs'], summary: '学习函数的定义方式和各种参数传递机制。' },
      { title: '模块与包管理', duration: '40分钟', points: ['import 导入模块', 'pip 包管理器', '虚拟环境 venv', '常用标准库'], summary: '了解 Python 的模块系统和包管理工具。' },
      { title: '文件操作与异常处理', duration: '45分钟', points: ['文件读写 open()', 'with 上下文管理器', 'try/except 异常处理', '自定义异常'], summary: '学习文件 I/O 操作和错误处理机制。' },
      { title: '面向对象编程基础', duration: '60分钟', points: ['类与对象', '__init__ 构造方法', '实例方法与类方法', '继承与多态'], summary: '掌握面向对象编程的核心概念。' },
    ],
    '综合应用': [
      { title: '常用标准库实战', duration: '50分钟', points: ['os/pathlib 文件路径', 'datetime 日期时间', 're 正则表达式', 'collections 高级数据结构'], summary: '学习 Python 常用标准库的实际应用。' },
      { title: '第三方库入门', duration: '45分钟', points: ['requests 网络请求', 'BeautifulSoup 网页解析', 'pandas 数据处理', 'matplotlib 数据可视化'], summary: '掌握常用第三方库的基本用法。' },
      { title: '项目实战：命令行工具', duration: '60分钟', points: ['argparse 参数解析', '日志 logging', '配置文件读取', '打包发布'], summary: '综合运用所学知识开发一个实用的命令行工具。' },
    ],
    '深入精通': [
      { title: '装饰器与生成器', duration: '55分钟', points: ['函数装饰器', '类装饰器', '生成器 yield', '迭代器协议'], summary: '深入理解 Python 的高级特性。' },
      { title: '并发编程', duration: '60分钟', points: ['多线程 threading', '多进程 multiprocessing', '异步 async/await', '线程池与进程池'], summary: '学习 Python 的并发编程模型。' },
      { title: '设计模式与最佳实践', duration: '50分钟', points: ['单例/工厂/观察者模式', 'SOLID 原则', '类型注解 Type Hints', '单元测试 pytest'], summary: '掌握常用设计模式和 Python 最佳实践。' },
    ],
  },
  javascript: {
    '基础入门': [
      { title: 'JavaScript 环境与第一个脚本', duration: '30分钟', points: ['浏览器控制台', 'script 标签引入', 'Node.js 安装', 'Hello World'], summary: '搭建 JavaScript 运行环境，编写第一个脚本。' },
      { title: '变量与数据类型', duration: '40分钟', points: ['let/const/var 区别', '基本数据类型', 'typeof 运算符', '类型转换'], summary: '掌握 JavaScript 的变量声明和数据类型。' },
      { title: '运算符与表达式', duration: '30分钟', points: ['算术运算符', '比较运算符（== vs ===）', '逻辑运算符', '空值合并运算符'], summary: '学习 JavaScript 运算符的使用和注意事项。' },
      { title: '字符串与模板字面量', duration: '35分钟', points: ['模板字面量', '字符串方法', '正则表达式基础', '字符串解构'], summary: '掌握字符串操作和模板字面量的使用。' },
    ],
    '知识构建': [
      { title: '条件语句与 switch', duration: '35分钟', points: ['if/else 语句', '三元运算符', 'switch 语句', 'truthy 与 falsy'], summary: '学习 JavaScript 的条件判断逻辑。' },
      { title: '函数与箭头函数', duration: '45分钟', points: ['函数声明与表达式', '箭头函数', '默认参数', '闭包基础'], summary: '深入理解函数的各种定义方式和闭包概念。' },
      { title: '数组与对象', duration: '50分钟', points: ['数组方法 map/filter/reduce', '对象解构', '展开运算符', 'Array.from'], summary: '掌握数组和对象的高级操作方法。' },
      { title: 'DOM 操作基础', duration: '45分钟', points: ['querySelector 选择器', '事件监听 addEventListener', 'DOM 节点操作', 'class 操作'], summary: '学习浏览器 DOM 的基本操作方法。' },
    ],
    '能力提升': [
      { title: '异步编程 Promise', duration: '50分钟', points: ['Promise 基础', 'then/catch 链式调用', 'Promise.all/race', 'async/await 语法'], summary: '掌握 JavaScript 异步编程的核心概念。' },
      { title: 'ES6+ 新特性', duration: '45分钟', points: ['解构赋值', 'Symbol 与 Iterator', 'Map 与 Set', '模块化 import/export'], summary: '学习 ES6 及以上版本的重要新特性。' },
      { title: '原型与面向对象', duration: '50分钟', points: ['原型链', 'class 语法糖', '继承 extends', '静态方法'], summary: '理解 JavaScript 的原型继承和面向对象编程。' },
      { title: 'Fetch API 与网络请求', duration: '40分钟', points: ['fetch 基本用法', 'GET/POST 请求', 'JSON 数据处理', '错误处理'], summary: '学习使用 Fetch API 进行网络通信。' },
    ],
    '综合应用': [
      { title: '事件循环与执行机制', duration: '45分钟', points: ['调用栈', '任务队列与微任务', '事件循环机制', '常见面试题解析'], summary: '深入理解 JavaScript 的事件循环和执行机制。' },
      { title: 'TypeScript 入门', duration: '50分钟', points: ['类型注解', '接口 interface', '泛型基础', '类型体操入门'], summary: '学习 TypeScript 的基本类型系统和用法。' },
      { title: '前端框架概念', duration: '45分钟', points: ['组件化思想', '虚拟 DOM', '响应式原理', '状态管理概念'], summary: '了解现代前端框架的核心设计思想。' },
    ],
    '深入精通': [
      { title: '性能优化技巧', duration: '50分钟', points: ['防抖与节流', '懒加载', '代码分割', '内存管理'], summary: '掌握前端性能优化的核心策略。' },
      { title: '设计模式实战', duration: '55分钟', points: ['观察者模式', '发布订阅模式', '策略模式', '单例模式'], summary: '学习 JavaScript 中常用设计模式的实现。' },
      { title: '工程化与构建工具', duration: '50分钟', points: ['Webpack/Vite 配置', 'ESLint 代码规范', 'Git 工作流', 'CI/CD 基础'], summary: '了解前端工程化的完整流程和工具链。' },
    ],
  },
  '数据结构': {
    '基础入门': [
      { title: '数据结构概述与复杂度分析', duration: '40分钟', points: ['什么是数据结构', '时间复杂度 O(n)', '空间复杂度', 'Big O 记号'], summary: '理解数据结构的基本概念和算法复杂度分析方法。' },
      { title: '数组与链表', duration: '50分钟', points: ['数组的连续存储', '单链表实现', '双向链表', '数组 vs 链表对比'], summary: '掌握最基础的线性数据结构：数组和链表。' },
      { title: '栈与队列', duration: '45分钟', points: ['栈的 LIFO 特性', '栈的应用场景', '队列的 FIFO 特性', '双端队列'], summary: '学习栈和队列的实现原理和应用场景。' },
    ],
    '知识构建': [
      { title: '哈希表', duration: '50分钟', points: ['哈希函数设计', '冲突解决策略', '哈希表实现', 'LeetCode 实战'], summary: '深入理解哈希表的原理和高效查找能力。' },
      { title: '树与二叉树', duration: '55分钟', points: ['树的术语', '二叉树遍历（前中后序）', '二叉搜索树 BST', '树的递归思维'], summary: '学习树结构的基本概念和遍历算法。' },
      { title: '堆与优先队列', duration: '45分钟', points: ['最大堆与最小堆', '堆的插入与删除', '优先队列应用', 'Top-K 问题'], summary: '掌握堆数据结构及其在优先队列中的应用。' },
      { title: '图的基础', duration: '50分钟', points: ['图的表示（邻接矩阵/邻接表）', 'BFS 广度优先搜索', 'DFS 深度优先搜索', '连通性判断'], summary: '学习图的基本表示方法和搜索算法。' },
    ],
    '能力提升': [
      { title: '高级树结构', duration: '50分钟', points: ['AVL 树', '红黑树概念', 'B 树与 B+ 树', '字典树 Trie'], summary: '了解各种平衡树和高级树结构的应用。' },
      { title: '图的进阶算法', duration: '55分钟', points: ['最短路径 Dijkstra', '最小生成树', '拓扑排序', '并查集'], summary: '学习图论中的经典算法。' },
      { title: '排序算法全面解析', duration: '60分钟', points: ['快速排序', '归并排序', '堆排序', '排序算法对比分析'], summary: '系统学习各种排序算法的实现和性能特点。' },
    ],
    '综合应用': [
      { title: '数据结构综合实战', duration: '60分钟', points: ['LRU 缓存实现', '表达式求值', '前缀和技巧', '滑动窗口'], summary: '综合运用多种数据结构解决实际问题。' },
      { title: '面试高频数据结构题', duration: '50分钟', points: ['链表反转', '二叉树层序遍历', '岛屿问题', '单调栈应用'], summary: '攻克面试中高频出现的数据结构题目。' },
    ],
  },
  '算法': {
    '基础入门': [
      { title: '算法思维入门', duration: '40分钟', points: ['什么是算法', '贪心思想', '分治思想', '递归基础'], summary: '建立算法思维，了解基本的算法设计范式。' },
      { title: '双指针技巧', duration: '45分钟', points: ['对撞指针', '快慢指针', '滑动窗口', '区间问题'], summary: '掌握双指针这一高效的算法技巧。' },
      { title: '二分查找', duration: '40分钟', points: ['标准二分查找', '查找边界', '旋转数组查找', '二分答案'], summary: '深入学习二分查找的各种变形和应用。' },
    ],
    '知识构建': [
      { title: '递归与回溯', duration: '55分钟', points: ['递归三要素', '全排列问题', 'N 皇后问题', '组合与子集'], summary: '掌握递归和回溯算法的设计方法。' },
      { title: '动态规划基础', duration: '60分钟', points: ['状态定义', '状态转移方程', '斐波那契数列', '爬楼梯问题'], summary: '理解动态规划的核心思想和解题步骤。' },
      { title: '动态规划进阶', duration: '55分钟', points: ['背包问题', '最长公共子序列', '编辑距离', '区间 DP'], summary: '学习动态规划的经典问题和优化技巧。' },
      { title: '搜索算法 BFS/DFS', duration: '50分钟', points: ['BFS 层序遍历', 'DFS 回溯搜索', '记忆化搜索', '双向 BFS'], summary: '掌握广度和深度优先搜索算法。' },
    ],
    '能力提升': [
      { title: '贪心算法', duration: '45分钟', points: ['贪心策略证明', '区间调度问题', '跳跃游戏', ' Huffman 编码'], summary: '学习贪心算法的设计思路和适用场景。' },
      { title: '字符串算法', duration: '50分钟', points: ['KMP 算法', 'Rabin-Karp 哈希', 'Manacher 回文', '字符串匹配'], summary: '掌握字符串处理中的经典算法。' },
      { title: '数学与位运算', duration: '45分钟', points: ['质数筛选', 'GCD 与 LCM', '位运算技巧', '快速幂'], summary: '学习算法中常用的数学知识和位运算技巧。' },
    ],
    '综合应用': [
      { title: '高频算法面试题精讲', duration: '60分钟', points: ['两数之和', '三数之和', '最长有效括号', '接雨水'], summary: '精讲面试中最高频的算法题目。' },
      { title: '竞赛算法入门', duration: '55分钟', points: ['并查集', '线段树概念', '网络流基础', '计算几何入门'], summary: '了解竞赛级别的算法和数据结构。' },
    ],
  },
  '数据库': {
    '基础入门': [
      { title: '数据库概述与 MySQL 安装', duration: '35分钟', points: ['关系型数据库概念', 'MySQL 安装配置', 'SQL 基本语法', '数据库设计范式'], summary: '了解数据库基本概念，搭建 MySQL 环境。' },
      { title: 'SQL 基础查询', duration: '45分钟', points: ['SELECT 语句', 'WHERE 条件过滤', 'ORDER BY 排序', 'LIMIT 分页'], summary: '学习 SQL 的基本查询语法。' },
      { title: '聚合函数与分组', duration: '40分钟', points: ['COUNT/SUM/AVG', 'GROUP BY 分组', 'HAVING 过滤', '子查询基础'], summary: '掌握 SQL 的聚合查询和分组功能。' },
    ],
    '知识构建': [
      { title: '多表连接查询', duration: '50分钟', points: ['INNER JOIN', 'LEFT/RIGHT JOIN', '自连接', '子查询与 CTE'], summary: '学习多表关联查询的各种方式。' },
      { title: '表设计与索引', duration: '45分钟', points: ['主键与外键', '索引原理 B+ 树', '复合索引', '索引优化策略'], summary: '掌握数据库表设计和索引优化。' },
      { title: '事务与并发控制', duration: '50分钟', points: ['ACID 特性', '事务隔离级别', '锁机制', 'MVCC 原理'], summary: '深入理解数据库事务和并发控制机制。' },
    ],
    '能力提升': [
      { title: 'SQL 高级技巧', duration: '45分钟', points: ['窗口函数', '递归 CTE', 'JSON 数据类型', '存储过程'], summary: '学习 SQL 的高级特性和实用技巧。' },
      { title: '数据库性能优化', duration: '50分钟', points: ['执行计划分析 EXPLAIN', '慢查询优化', '分库分表概念', '读写分离'], summary: '掌握数据库性能调优的方法。' },
      { title: 'NoSQL 数据库入门', duration: '45分钟', points: ['Redis 基本数据结构', 'MongoDB 文档数据库', '适用场景对比', '缓存策略'], summary: '了解 NoSQL 数据库的类型和应用场景。' },
    ],
    '综合应用': [
      { title: '数据库设计与实战', duration: '60分钟', points: ['电商系统数据库设计', '用户权限系统', '订单系统设计', '数据迁移策略'], summary: '综合运用数据库知识设计实际系统。' },
    ],
  },
  '机器学习': {
    '基础入门': [
      { title: '机器学习概述', duration: '40分钟', points: ['监督/无监督/强化学习', '常见算法分类', '开发环境搭建', 'Python 数据科学库'], summary: '了解机器学习的基本概念和分类。' },
      { title: 'NumPy 与数据处理', duration: '45分钟', points: ['ndarray 基本操作', '数组运算与广播', '线性代数运算', '随机数生成'], summary: '掌握 NumPy 数值计算库的使用。' },
      { title: 'Pandas 数据分析', duration: '50分钟', points: ['DataFrame 操作', '数据清洗', '特征工程基础', '数据可视化'], summary: '学习使用 Pandas 进行数据分析和预处理。' },
    ],
    '知识构建': [
      { title: '线性回归', duration: '50分钟', points: ['最小二乘法', '梯度下降', '正则化 L1/L2', 'Scikit-learn 实战'], summary: '学习最基础的机器学习算法——线性回归。' },
      { title: '逻辑回归与分类', duration: '50分钟', points: ['Sigmoid 函数', '交叉熵损失', '多分类问题', '模型评估指标'], summary: '掌握逻辑回归和分类问题的解决方法。' },
      { title: '决策树与随机森林', duration: '45分钟', points: ['信息熵与信息增益', '决策树构建', '随机森林原理', '特征重要性'], summary: '学习决策树和集成学习方法。' },
      { title: '支持向量机 SVM', duration: '45分钟', points: ['最大间隔分类', '核技巧', '软间隔', 'SVM 实战'], summary: '理解支持向量机的原理和应用。' },
    ],
    '能力提升': [
      { title: '神经网络基础', duration: '55分钟', points: ['感知机模型', '激活函数', '前向传播', '反向传播算法'], summary: '学习神经网络的基本原理和训练过程。' },
      { title: '深度学习框架 PyTorch', duration: '60分钟', points: ['张量操作', '自动求导', '构建神经网络', '训练循环'], summary: '掌握 PyTorch 深度学习框架的基本用法。' },
      { title: 'CNN 卷积神经网络', duration: '55分钟', points: ['卷积层', '池化层', '经典网络架构', '图像分类实战'], summary: '学习卷积神经网络的结构和应用。' },
    ],
    '综合应用': [
      { title: '模型评估与调优', duration: '50分钟', points: ['交叉验证', '超参数调优', '偏差-方差权衡', '模型选择策略'], summary: '掌握模型评估和调优的系统方法。' },
      { title: 'NLP 自然语言处理入门', duration: '55分钟', points: ['文本预处理', '词向量 Word2Vec', '文本分类', 'Transformer 概念'], summary: '了解自然语言处理的基本技术和方法。' },
      { title: '项目实战：端到端 ML 项目', duration: '60分钟', points: ['数据收集与清洗', '特征工程', '模型训练与选择', '部署与监控'], summary: '完成一个完整的机器学习项目流程。' },
    ],
  },
  go: {
    '基础入门': [
      { title: 'Go 环境搭建与 Hello World', duration: '30分钟', points: ['安装 Go', 'GOPATH 与 Go Modules', '编写第一个程序', 'go run/build 命令'], summary: '搭建 Go 开发环境，编写并运行第一个 Go 程序。' },
      { title: '变量、类型与常量', duration: '40分钟', points: ['变量声明 var/:=', '基本数据类型', '常量 const/iota', '类型转换'], summary: '掌握 Go 的基本语法和数据类型。' },
      { title: '流程控制', duration: '35分钟', points: ['if/else 条件判断', 'for 循环（唯一循环结构）', 'switch 语句', 'defer 关键字'], summary: '学习 Go 的流程控制语句。' },
    ],
    '知识构建': [
      { title: '函数与方法', duration: '45分钟', points: ['多返回值', '命名返回值', '可变参数', '方法的接收者'], summary: '掌握 Go 函数的定义和各种特性。' },
      { title: '数组、切片与映射', duration: '50分钟', points: ['数组与切片区别', '切片扩容机制', 'map 的使用', 'make 和 new'], summary: '深入理解 Go 的核心数据结构。' },
      { title: '结构体与接口', duration: '50分钟', points: ['结构体定义与嵌套', '接口的隐式实现', '空接口 any', '类型断言'], summary: '学习 Go 的面向对象编程方式。' },
      { title: '错误处理', duration: '35分钟', points: ['error 接口', 'errors.Is/As', 'panic 与 recover', '自定义错误类型'], summary: '掌握 Go 独特的错误处理机制。' },
    ],
    '能力提升': [
      { title: '并发编程 Goroutine', duration: '50分钟', points: ['goroutine 创建', 'Channel 通信', 'select 语句', 'sync 包'], summary: '学习 Go 的并发编程模型。' },
      { title: '标准库常用包', duration: '45分钟', points: ['fmt/io 包', 'net/http', 'encoding/json', 'os/filepath'], summary: '掌握 Go 标准库的常用功能。' },
      { title: '单元测试', duration: '40分钟', points: ['testing 包', '表驱动测试', '基准测试', 'mock 测试'], summary: '学习 Go 的测试框架和最佳实践。' },
    ],
    '综合应用': [
      { title: 'Web 开发入门', duration: '55分钟', points: ['HTTP 路由', '中间件模式', '模板渲染', 'RESTful API'], summary: '使用 Go 开发 Web 应用和 API。' },
      { title: '项目实战：CLI 工具开发', duration: '50分钟', points: ['cobra 库', '命令行参数解析', '配置文件管理', '日志与错误处理'], summary: '综合运用 Go 知识开发命令行工具。' },
    ],
  },
};

// 阶段名称模板
const PHASE_TEMPLATES: Record<string, string[]> = {
  python: ['基础入门', '知识构建', '能力提升', '综合应用', '深入精通'],
  javascript: ['基础入门', '知识构建', '能力提升', '综合应用', '深入精通'],
  '数据结构': ['基础入门', '知识构建', '能力提升', '综合应用'],
  '算法': ['基础入门', '知识构建', '能力提升', '综合应用'],
  '数据库': ['基础入门', '知识构建', '能力提升', '综合应用'],
  '机器学习': ['基础入门', '知识构建', '能力提升', '综合应用'],
  go: ['基础入门', '知识构建', '能力提升', '综合应用'],
};

// 阶段描述模板
const PHASE_DESCRIPTIONS: Record<string, string[]> = {
  python: [
    '搭建开发环境，学习 Python 基础语法和数据类型',
    '掌握流程控制和数据结构，建立编程思维',
    '学习函数、模块和面向对象编程',
    '运用标准库和第三方库解决实际问题',
    '深入理解高级特性，掌握设计模式和最佳实践',
  ],
  javascript: [
    '搭建开发环境，学习 JavaScript 基础语法',
    '掌握函数、数组和 DOM 操作',
    '学习异步编程和 ES6+ 新特性',
    '理解执行机制，接触 TypeScript 和框架概念',
    '掌握性能优化和工程化实践',
  ],
  '数据结构': [
    '理解复杂度分析，掌握数组和链表',
    '学习哈希表、树和图的基础知识',
    '掌握高级树结构和图论算法',
    '综合运用数据结构解决实际问题',
  ],
  '算法': [
    '建立算法思维，掌握双指针和二分查找',
    '学习递归、回溯和动态规划',
    '掌握贪心算法、字符串算法和位运算',
    '攻克高频面试题和竞赛算法',
  ],
  '数据库': [
    '了解数据库概念，掌握 SQL 基础查询',
    '学习多表连接、索引和事务',
    '掌握 SQL 高级技巧和性能优化',
    '综合运用数据库知识设计实际系统',
  ],
  '机器学习': [
    '了解机器学习概念，掌握数据处理工具',
    '学习经典机器学习算法',
    '掌握神经网络和深度学习框架',
    '完成端到端机器学习项目',
  ],
  go: [
    '搭建开发环境，学习 Go 基础语法',
    '掌握函数、切片、映射和接口',
    '学习并发编程和标准库',
    '开发 Web 应用和 CLI 工具',
  ],
};

function generateId(): string {
  return `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLessonId(phaseIdx: number, lessonIdx: number): string {
  return `les_${String(phaseIdx + 1).padStart(3, '0')}${String(lessonIdx + 1).padStart(3, '0')}`;
}

function lookupSubjectKey(subject: string): string {
  const lower = subject.toLowerCase();
  for (const key of Object.keys(SUBJECT_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  // Try Chinese matching
  if (lower.includes('python') || lower.includes('蟒')) return 'python';
  if (lower.includes('javascript') || lower.includes('js')) return 'javascript';
  if (lower.includes('数据结构')) return '数据结构';
  if (lower.includes('算法')) return '算法';
  if (lower.includes('数据库') || lower.includes('mysql') || lower.includes('sql')) return '数据库';
  if (lower.includes('机器学习') || lower.includes('ml') || lower.includes('深度学习')) return '机器学习';
  if (lower.includes('go') || lower.includes('golang')) return 'go';
  return 'python'; // default
}

const createLearningPathSchema = Type.Object({
  subject: Type.String({
    description: "学科/技能名称，例如：'Python编程'、'高中物理'、'日语N3'",
  }),
  goal: Type.String({
    description: "学习目标，例如：'掌握Python基础语法并能编写简单程序'、'高考物理达到90分以上'",
  }),
  current_level: Type.Integer({
    minimum: 0,
    maximum: 10,
    description: "当前水平自评，0=完全零基础，5=有一定基础，10=已经精通",
  }),
  target_level: Type.Integer({
    minimum: 1,
    maximum: 10,
    description: "目标水平，1-10，必须大于 current_level",
  }),
  available_time_per_day: Type.Optional(Type.Integer({
    minimum: 15,
    maximum: 480,
    description: "每天可用的学习时间（分钟），默认为 60 分钟",
  })),
  pace: Type.Optional(Type.String({
    description: "学习节奏：'fast'（快速冲刺）、'normal'（稳扎稳打）、'relaxed'（轻松随意）",
  })),
});

type CreateLearningPathParams = Static<typeof createLearningPathSchema>;

export interface PlanLesson {
  id: string;
  title: string;
  icon: string;
  duration: string;
  done: boolean;
  current: boolean;
  locked: boolean;
  points: string[];
  summary: string;
}

export interface PlanPhase {
  name: string;
  done: boolean;
  pct: number;
  current: boolean;
  locked: boolean;
  lessons: PlanLesson[];
}

export interface PlanResult {
  __plan_data__: true;
  name: string;
  subject: string;
  icon: string;
  color: string;
  bg: string;
  from: number;
  to: number;
  days: number;
  phases: PlanPhase[];
}

export function createLearningPathTool(): AgentTool<typeof createLearningPathSchema, PlanResult> {
  return {
    name: "create_learning_plan",
    label: "创建学习计划",
    description:
      "为用户创建个性化的学习计划。根据用户的学科、当前水平、目标水平、每日可用时间和学习节奏，生成包含多个阶段和课程的完整学习计划。返回结构化的计划数据，前端会自动渲染为可视化界面。",
    parameters: createLearningPathSchema,
    async execute(_toolCallId, params) {
      const {
        subject,
        goal,
        current_level,
        target_level,
        available_time_per_day = 60,
        pace = 'normal',
      } = params;

      const from = Math.max(0, Math.min(10, current_level));
      const to = Math.max(from + 1, Math.min(10, target_level));

      // Calculate days based on pace
      const paceDaysPerLevel: Record<string, number> = {
        fast: 10,
        normal: 15,
        relaxed: 20,
      };
      const daysPerLevel = paceDaysPerLevel[pace] || 15;
      const totalDays = (to - from) * daysPerLevel;

      // Look up subject config
      const subjectKey = lookupSubjectKey(subject);
      const subjectCfg = SUBJECT_MAP[subjectKey] || { icon: '📚', color: '#4f6af6', bg: '#dce1ff' };
      const phaseTemplates = PHASE_TEMPLATES[subjectKey] || ['基础入门', '知识构建', '能力提升', '综合应用'];
      const phaseDescriptions = PHASE_DESCRIPTIONS[subjectKey] || phaseTemplates.map(n => `${subject} ${n}阶段`);
      const subjectContent = SUBJECT_CONTENT[subjectKey] || SUBJECT_CONTENT['python'];

      // Determine number of phases (3-5) based on level range
      const levelGap = to - from;
      let phaseCount: number;
      if (levelGap <= 2) phaseCount = 3;
      else if (levelGap <= 4) phaseCount = 4;
      else phaseCount = 5;

      // Select phase templates
      const selectedPhases = phaseTemplates.slice(0, phaseCount);
      const selectedDescriptions = phaseDescriptions.slice(0, phaseCount);

      // Calculate days per phase
      const daysPerPhase = Math.round(totalDays / phaseCount);

      // Build phases with lessons
      const phases: PlanPhase[] = [];
      let lessonCounter = 0;

      for (let i = 0; i < phaseCount; i++) {
        const phaseName = selectedPhases[i] || `阶段 ${i + 1}`;
        const phaseDesc = selectedDescriptions[i] || `${subject}学习第${i + 1}阶段`;

        // Get lessons for this phase
        const contentLessons = subjectContent[phaseName] || subjectContent[selectedPhases[0]] || [];
        const lessonCount = Math.min(contentLessons.length, 3 + Math.floor(Math.random() * 3)); // 3-5 lessons

        const lessons: PlanLesson[] = [];
        for (let j = 0; j < lessonCount && j < contentLessons.length; j++) {
          const contentLesson = contentLessons[j];
          const isFirstPhase = i === 0;
          const isFirstLesson = j === 0;

          lessons.push({
            id: generateLessonId(i, j),
            title: contentLesson.title,
            icon: '📝',
            duration: contentLesson.duration,
            done: false,
            current: isFirstPhase && isFirstLesson,
            locked: !(isFirstPhase && isFirstLesson),
            points: contentLesson.points,
            summary: contentLesson.summary,
          });
          lessonCounter++;
        }

        // If no content lessons found, generate generic ones
        if (lessons.length === 0) {
          for (let j = 0; j < 3; j++) {
            const isFirstPhase = i === 0;
            const isFirstLesson = j === 0;
            lessons.push({
              id: generateLessonId(i, j),
              title: `${subject} ${phaseName} - 课程 ${j + 1}`,
              icon: '📝',
              duration: `${30 + Math.floor(Math.random() * 30)}分钟`,
              done: false,
              current: isFirstPhase && isFirstLesson,
              locked: !(isFirstPhase && isFirstLesson),
              points: [`${phaseName}核心知识点 ${j + 1}`, `${phaseName}核心知识点 ${j + 2}`],
              summary: `${subject} ${phaseName}阶段的第${j + 1}门课程。`,
            });
            lessonCounter++;
          }
        }

        // Set current/locked for lessons within phase
        for (let j = 0; j < lessons.length; j++) {
          if (i === 0) {
            lessons[j].locked = j > 0;
            lessons[j].current = j === 0;
          } else {
            lessons[j].locked = true;
            lessons[j].current = false;
          }
        }

        const startDay = i * daysPerPhase + 1;
        const endDay = i === phaseCount - 1 ? totalDays : (i + 1) * daysPerPhase;

        phases.push({
          name: `${phaseName}（第${startDay}-${endDay}天）`,
          done: false,
          pct: 0,
          current: i === 0,
          locked: i > 0,
          lessons,
        });
      }

      const result: PlanResult = {
        __plan_data__: true,
        name: `${subject} Lv.${from} → Lv.${to}`,
        subject,
        icon: subjectCfg.icon,
        color: subjectCfg.color,
        bg: subjectCfg.bg,
        from,
        to,
        days: totalDays,
        phases,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  };
}

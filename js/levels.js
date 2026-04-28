/* global Levels */
var Levels = (function () {
  'use strict';

  // Node positions are defined as percentages from canvas center (0.5, 0.5)
  // getLevel() converts them to pixel coordinates at runtime

  var LEVELS = [
    {
      id: 1,
      title: '家庭中的误解',
      subtitle: '误解需要道歉来化解',
      sourceId: 'source',
      hint: '将恩典之源连接到其他节点，用行动化解心结。',
      nodes: [
        { id: 'source',    name: '恩典之源', type: 'source',  px: 0.5,  py: 0.2,  allowedTargets: ['emotion', 'state'] },
        { id: 'misunder',  name: '误解',     type: 'emotion', px: 0.25, py: 0.4,  blocked: true, unblockers: ['action'],  allowedTargets: ['virtue'] },
        { id: 'silence',   name: '沉默',     type: 'state',   px: 0.75, py: 0.4,  blocked: true, unblockers: ['action'],  allowedTargets: ['virtue'] },
        { id: 'apology',   name: '道歉',     type: 'action',  px: 0.2,  py: 0.7,  allowedTargets: ['emotion', 'state'] },
        { id: 'listen',    name: '倾听',     type: 'action',  px: 0.5,  py: 0.65, allowedTargets: ['emotion', 'state', 'virtue'] },
        { id: 'forgive',   name: '宽恕',     type: 'virtue',  px: 0.8,  py: 0.7,  allowedTargets: ['person'] }
      ]
    },
    {
      id: 2,
      title: '病房中的陪伴',
      subtitle: '在痛苦中，祈祷与陪伴带来希望',
      sourceId: 'source',
      hint: '恩典可以治愈身体的痛苦，也能驱散内心的恐惧。',
      nodes: [
        { id: 'source',  name: '恩典之源', type: 'source',  px: 0.5,  py: 0.15, allowedTargets: ['state', 'action'] },
        { id: 'pain',    name: '痛苦',     type: 'state',   px: 0.25, py: 0.4,  blocked: true, unblockers: ['action'],  allowedTargets: ['virtue'] },
        { id: 'fear',    name: '恐惧',     type: 'emotion', px: 0.75, py: 0.4,  blocked: true, unblockers: ['virtue'],  allowedTargets: ['virtue'] },
        { id: 'pray',    name: '祈祷',     type: 'action',  px: 0.2,  py: 0.7,  allowedTargets: ['state'] },
        { id: 'accomp',  name: '陪伴',     type: 'action',  px: 0.5,  py: 0.6,  allowedTargets: ['state', 'emotion'] },
        { id: 'hope',    name: '希望',     type: 'virtue',  px: 0.8,  py: 0.7,  allowedTargets: ['emotion'] }
      ]
    },
    {
      id: 3,
      title: '城市中的陌生人',
      subtitle: '责任与行动能打破冷漠',
      sourceId: 'source',
      hint: '从恩典出发，让行动改变冷漠与贫穷。',
      nodes: [
        { id: 'source',     name: '恩典之源', type: 'source',  px: 0.5,  py: 0.15, allowedTargets: ['emotion', 'state', 'action'] },
        { id: 'cold',       name: '冷漠',     type: 'emotion', px: 0.25, py: 0.4,  blocked: true, unblockers: ['virtue'], allowedTargets: ['state'] },
        { id: 'poverty',    name: '贫穷',     type: 'state',   px: 0.75, py: 0.4,  blocked: true, unblockers: ['action'], allowedTargets: ['virtue'] },
        { id: 'duty',       name: '责任',     type: 'virtue',  px: 0.2,  py: 0.7,  allowedTargets: ['emotion'] },
        { id: 'act',        name: '行动',     type: 'action',  px: 0.5,  py: 0.65, allowedTargets: ['state', 'emotion'] },
        { id: 'compassion', name: '怜悯',     type: 'virtue',  px: 0.8,  py: 0.7,  allowedTargets: ['person'] }
      ]
    },
    {
      id: 4,
      title: '教会之外的人',
      subtitle: '良知能触及不信的心灵',
      sourceId: 'source',
      hint: '恩典能唤醒良知，让爱打破隔阂。',
      nodes: [
        { id: 'source',   name: '恩典之源', type: 'source',  px: 0.5,  py: 0.15, allowedTargets: ['person', 'virtue'] },
        { id: 'unbel',    name: '不信者',   type: 'person',  px: 0.25, py: 0.4,  blocked: true, unblockers: ['virtue'], allowedTargets: ['virtue'] },
        { id: 'wall',     name: '隔阂',     type: 'state',   px: 0.75, py: 0.4,  blocked: true, unblockers: ['action'], allowedTargets: ['virtue'] },
        { id: 'consc',    name: '良知',     type: 'virtue',  px: 0.2,  py: 0.7,  allowedTargets: ['person'] },
        { id: 'love',     name: '爱',       type: 'action',  px: 0.5,  py: 0.65, allowedTargets: ['state', 'person'] },
        { id: 'accept',   name: '接纳',     type: 'virtue',  px: 0.8,  py: 0.7,  allowedTargets: ['person', 'state'] }
      ]
    },
    {
      id: 5,
      title: '破碎的共同体',
      subtitle: '悔改与记忆能修复分裂',
      sourceId: 'source',
      hint: '恩典修复一切，从悔改到合一。',
      nodes: [
        { id: 'source',   name: '恩典之源', type: 'source',  px: 0.5,  py: 0.15, allowedTargets: ['emotion', 'virtue', 'state'] },
        { id: 'division', name: '分裂',     type: 'state',   px: 0.25, py: 0.4,  blocked: true, unblockers: ['virtue'],  allowedTargets: ['virtue'] },
        { id: 'pride',    name: '骄傲',     type: 'emotion', px: 0.75, py: 0.4,  blocked: true, unblockers: ['virtue'],  allowedTargets: ['virtue'] },
        { id: 'repent',   name: '悔改',     type: 'virtue',  px: 0.2,  py: 0.7,  allowedTargets: ['state', 'emotion'] },
        { id: 'memory',   name: '记忆',     type: 'virtue',  px: 0.5,  py: 0.65, allowedTargets: ['emotion'] },
        { id: 'unity',    name: '合一',     type: 'state',   px: 0.8,  py: 0.7,  allowedTargets: ['person'] }
      ]
    }
  ];

  function getLevel(index) {
    var levelDef = LEVELS[index];
    if (!levelDef) return null;

    var w = CanvasEngine.width / (window.devicePixelRatio || 1);
    var h = CanvasEngine.height / (window.devicePixelRatio || 1);
    var cx = w / 2;
    var cy = h / 2;

    // Copy level and convert percentage positions to pixels
    var level = {
      id: levelDef.id,
      title: levelDef.title,
      subtitle: levelDef.subtitle,
      sourceId: levelDef.sourceId,
      hint: levelDef.hint,
      nodes: []
    };

    for (var i = 0; i < levelDef.nodes.length; i++) {
      var nd = levelDef.nodes[i];
      level.nodes.push({
        id: nd.id,
        name: nd.name,
        type: nd.type,
        x: nd.px * w,
        y: nd.py * h,
        blocked: nd.blocked || false,
        unblockers: nd.unblockers ? nd.unblockers.slice() : [],
        allowedTargets: nd.allowedTargets ? nd.allowedTargets.slice() : []
      });
    }

    return level;
  }

  return {
    LEVELS: LEVELS,
    getLevel: getLevel,
    get total() { return LEVELS.length; }
  };
})();

/* global Levels */
var Levels = (function () {
  'use strict';

  // Node positions are defined as percentages from canvas center (0.5, 0.5)
  // getLevel() converts them to pixel coordinates at runtime
  // mobilePx provides alternative positions for narrow screens

  // Theme color mapping
  var THEME_COLORS = {
    family:    { bg1: '#1a1a2e', bg2: '#2d1b3d', accent: '#FFD700' },
    hospital:  { bg1: '#1a2a3e', bg2: '#1a2e2e', accent: '#4ECDC4' },
    city:      { bg1: '#1a1a2e', bg2: '#2e2a1a', accent: '#F97316' },
    community: { bg1: '#2e1a2e', bg2: '#1a2e2a', accent: '#A78BFA' },
    nature:     { bg1: '#1a2e1a', bg2: '#2e3a1a', accent: '#4ADE80' },
    sanctuary:  { bg1: '#2e2a1a', bg2: '#3a2a1a', accent: '#FBBF24' },
    temple:     { bg1: '#2e1a2e', bg2: '#1a1a3e', accent: '#C084FC' },
    market:     { bg1: '#2e2a1a', bg2: '#1a2a2e', accent: '#FB923C' },
    harbor:     { bg1: '#1a2a3e', bg2: '#1a3a3e', accent: '#38BDF8' },
    abyss:      { bg1: '#0a0a1a', bg2: '#1a0a2e', accent: '#818CF8' },
    kingdom:    { bg1: '#2e2a0a', bg2: '#1a1a0a', accent: '#FCD34D' },
    wilderness: { bg1: '#1a1a2e', bg2: '#16213e', accent: '#e94560', nodeGlow: '#ff6b6b', edge: '#c44569' },
    wedding:    { bg1: '#2d132c', bg2: '#801336', accent: '#e8a87c', nodeGlow: '#d63031', edge: '#fd79a8' },
    eternity:   { bg1: '#0c0032', bg2: '#190061', accent: '#240090', nodeGlow: '#3500d3', edge: '#00ffcc' },
    default:   { bg1: '#1a1a2e', bg2: '#16213e', accent: '#FFD700' }
  };

  var LEVELS = [
    {
      id: 1,
      title: '家庭中的误解',
      subtitle: '误解需要道歉来化解',
      sourceId: 'source',
      hint: '将恩典之源连接到其他节点，用行动化解心结。',
      theme: 'family',
      narrative: '一个家庭中，误解悄然蔓延，沉默成了隔墙。恩典能否打破这堵墙？',
      completionMessage: '误解化为理解，沉默被温柔打破。恩典在家中流淌。',
      difficulty: 1,
      connections: 5,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.2,
          allowedTargets: ['*'],
          description: '一切恩典的源头'
        },
        {
          id: 'misunder', name: '误解', type: 'emotion',
          px: 0.25, py: 0.4,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '因误读而产生的情感障碍'
        },
        {
          id: 'silence', name: '沉默', type: 'state',
          px: 0.75, py: 0.4,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '无声的隔阂，需要被打破'
        },
        {
          id: 'apology', name: '道歉', type: 'action',
          px: 0.2, py: 0.7,
          allowedTargets: ['emotion', 'state'],
          description: '承认错误的第一步'
        },
        {
          id: 'listen', name: '倾听', type: 'action',
          px: 0.5, py: 0.65,
          allowedTargets: ['emotion', 'state', 'virtue'],
          description: '用心聆听对方的声音'
        },
        {
          id: 'forgive', name: '宽恕', type: 'virtue',
          px: 0.8, py: 0.7,
          allowedTargets: ['person'],
          description: '放下伤痛，选择和好'
        }
      ]
    },
    {
      id: 2,
      title: '病房中的陪伴',
      subtitle: '在痛苦中，祈祷与陪伴带来希望',
      sourceId: 'source',
      hint: '恩典可以治愈身体的痛苦，也能驱散内心的恐惧。',
      theme: 'hospital',
      narrative: '病房里，痛苦的身体和恐惧的心灵需要恩典的抚慰。陪伴与祈祷，能否带来希望？',
      completionMessage: '痛苦被抚慰，恐惧被驱散。希望在恩典中绽放。',
      difficulty: 1,
      connections: 5,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.15,
          allowedTargets: ['*'],
          description: '治愈一切的恩典'
        },
        {
          id: 'pain', name: '痛苦', type: 'state',
          px: 0.25, py: 0.4,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '身体的苦楚，需要被关怀'
        },
        {
          id: 'fear', name: '恐惧', type: 'emotion',
          px: 0.75, py: 0.4,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '面对未知的害怕'
        },
        {
          id: 'pray', name: '祈祷', type: 'action',
          px: 0.2, py: 0.7,
          allowedTargets: ['state'],
          description: '向恩典祈求力量'
        },
        {
          id: 'accomp', name: '陪伴', type: 'action',
          px: 0.5, py: 0.6,
          allowedTargets: ['state', 'emotion'],
          description: '默默守护在身旁'
        },
        {
          id: 'hope', name: '希望', type: 'virtue',
          px: 0.8, py: 0.7,
          allowedTargets: ['emotion'],
          description: '黑暗中的微光'
        }
      ]
    },
    {
      id: 3,
      title: '城市中的陌生人',
      subtitle: '责任与行动能打破冷漠',
      sourceId: 'source',
      hint: '从恩典出发，让行动改变冷漠与贫穷。',
      theme: 'city',
      narrative: '熙攘的城市里，有人被冷漠包围，有人陷于贫穷。怜悯之心能否被唤醒？',
      completionMessage: '冷漠被责任融化，贫穷被行动改变。怜悯之光在城市中闪耀。',
      difficulty: 2,
      connections: 5,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.15,
          allowedTargets: ['*'],
          description: '照亮城市角落的恩典'
        },
        {
          id: 'cold', name: '冷漠', type: 'emotion',
          px: 0.25, py: 0.4,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['state'],
          description: '对他人苦难的无视'
        },
        {
          id: 'poverty', name: '贫穷', type: 'state',
          px: 0.75, py: 0.4,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '物质的匮乏，需要援手'
        },
        {
          id: 'duty', name: '责任', type: 'virtue',
          px: 0.2, py: 0.7,
          allowedTargets: ['emotion'],
          description: '内心深处的使命感'
        },
        {
          id: 'act', name: '行动', type: 'action',
          px: 0.5, py: 0.65,
          allowedTargets: ['state', 'emotion'],
          description: '走出舒适区的勇气'
        },
        {
          id: 'compassion', name: '怜悯', type: 'virtue',
          px: 0.8, py: 0.7,
          allowedTargets: ['person'],
          description: '感同身受的温柔'
        }
      ]
    },
    {
      id: 4,
      title: '教会之外的人',
      subtitle: '良知能触及不信的心灵',
      sourceId: 'source',
      hint: '恩典能唤醒良知，让爱打破隔阂。',
      theme: 'community',
      narrative: '有人站在信仰的门外，隔阂使他们远离。爱能否成为桥梁？',
      completionMessage: '隔阂被爱拆除，不信者被良知触动。恩典的桥梁已建成。',
      difficulty: 2,
      connections: 5,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.15,
          allowedTargets: ['*'],
          description: '无条件的恩典'
        },
        {
          id: 'unbel', name: '不信者', type: 'person',
          px: 0.25, py: 0.4,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '尚未认识恩典的人'
        },
        {
          id: 'wall', name: '隔阂', type: 'state',
          px: 0.75, py: 0.4,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '人心的围墙'
        },
        {
          id: 'consc', name: '良知', type: 'virtue',
          px: 0.2, py: 0.7,
          allowedTargets: ['person'],
          description: '内心深处的善念'
        },
        {
          id: 'love', name: '爱', type: 'action',
          px: 0.5, py: 0.65,
          allowedTargets: ['state', 'person'],
          description: '最强大的力量'
        },
        {
          id: 'accept', name: '接纳', type: 'virtue',
          px: 0.8, py: 0.7,
          allowedTargets: ['person', 'state'],
          description: '敞开心扉的勇气'
        }
      ]
    },
    {
      id: 5,
      title: '破碎的共同体',
      subtitle: '悔改与记忆能修复分裂',
      sourceId: 'source',
      hint: '恩典修复一切，从悔改到合一。',
      theme: 'community',
      narrative: '共同体因分裂而破碎，骄傲让人无法低头。悔改与记忆，能否重建合一？',
      completionMessage: '分裂被修复，骄傲被谦卑取代。共同体在恩典中重新合一。',
      difficulty: 3,
      connections: 5,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.15,
          allowedTargets: ['*'],
          description: '修复一切的恩典'
        },
        {
          id: 'division', name: '分裂', type: 'state',
          px: 0.25, py: 0.4,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '团体的裂痕'
        },
        {
          id: 'pride', name: '骄傲', type: 'emotion',
          px: 0.75, py: 0.4,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '自以为是的障碍'
        },
        {
          id: 'repent', name: '悔改', type: 'virtue',
          px: 0.2, py: 0.7,
          allowedTargets: ['state', 'emotion'],
          description: '回转归正的决心'
        },
        {
          id: 'memory', name: '记忆', type: 'virtue',
          px: 0.5, py: 0.65,
          allowedTargets: ['emotion'],
          description: '不忘初心，铭记恩典'
        },
        {
          id: 'unity', name: '合一', type: 'state',
          px: 0.8, py: 0.7,
          allowedTargets: ['person'],
          description: '在恩典中重新合一'
        }
      ]
    },
    {
      id: 6,
      title: '自然的呼唤',
      subtitle: '管家之职修复受造之物',
      sourceId: 'source',
      hint: '恩典委托人管理万物，从行动开始修复被伤害的自然。',
      theme: 'nature',
      narrative: '大地被污染侵蚀，荒芜蔓延。管家之职能否唤醒人对自然的敬畏与治愈？',
      completionMessage: '污染被治愈，荒芜重新繁盛。恩典在自然中流淌，和谐重归大地。',
      difficulty: 3,
      connections: 8,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.12,
          allowedTargets: ['*'],
          description: '创造万物的主'
        },
        {
          id: 'pollution', name: '污染', type: 'state',
          px: 0.18, py: 0.33,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '对大地的伤害与侵蚀'
        },
        {
          id: 'desolation', name: '荒芜', type: 'emotion',
          px: 0.82, py: 0.33,
          blocked: true, unblockers: ['action', 'virtue'],
          allowedTargets: ['virtue', 'state'],
          description: '被遗弃后的忧伤'
        },
        {
          id: 'steward', name: '管家', type: 'action',
          px: 0.12, py: 0.58,
          allowedTargets: ['state', 'emotion'],
          description: '忠心管理所托付之物'
        },
        {
          id: 'sow', name: '播种', type: 'action',
          px: 0.38, py: 0.55,
          allowedTargets: ['state', 'emotion', 'virtue'],
          description: '播下希望的种子'
        },
        {
          id: 'heal', name: '治愈', type: 'virtue',
          px: 0.62, py: 0.55,
          allowedTargets: ['emotion', 'state'],
          description: '修复破碎的创造'
        },
        {
          id: 'awe', name: '敬畏', type: 'virtue',
          px: 0.88, py: 0.6,
          allowedTargets: ['emotion', 'state'],
          description: '对造物之美的惊叹'
        },
        {
          id: 'harmony', name: '和谐', type: 'state',
          px: 0.5, py: 0.82,
          allowedTargets: ['person'],
          description: '人与自然的和好'
        }
      ]
    },
    {
      id: 7,
      title: '避难所的灯',
      subtitle: '接待与安慰照亮黑暗中的灵魂',
      sourceId: 'source',
      hint: '恩典为流浪者预备避难所，用行动点燃希望之光。',
      theme: 'sanctuary',
      narrative: '城市角落里，流浪者和孤独者在黑暗中挣扎。一盏灯、一次接待，能否改变一切？',
      completionMessage: '流浪者找到归宿，孤独者不再孤单。避难所的灯照亮了每一个角落。',
      difficulty: 3,
      connections: 8,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.1,
          allowedTargets: ['*'],
          description: '黑暗中的真光'
        },
        {
          id: 'wandering', name: '流浪', type: 'state',
          px: 0.18, py: 0.28,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '无处安放的灵魂'
        },
        {
          id: 'loneliness', name: '孤独', type: 'emotion',
          px: 0.82, py: 0.28,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '被遗忘的痛苦'
        },
        {
          id: 'panic', name: '恐慌', type: 'emotion',
          px: 0.35, py: 0.48,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '面对未知的恐惧'
        },
        {
          id: 'welcome', name: '接待', type: 'action',
          px: 0.12, py: 0.68,
          allowedTargets: ['state', 'emotion'],
          description: '敞开大门的温暖'
        },
        {
          id: 'shelter', name: '庇护', type: 'action',
          px: 0.5, py: 0.58,
          allowedTargets: ['state', 'emotion'],
          description: '遮风挡雨的怀抱'
        },
        {
          id: 'comfort', name: '安慰', type: 'virtue',
          px: 0.7, py: 0.58,
          allowedTargets: ['emotion', 'state'],
          description: '温柔的同在'
        },
        {
          id: 'peace', name: '平安', type: 'virtue',
          px: 0.88, py: 0.72,
          allowedTargets: ['person', 'emotion'],
          description: '风浪之后的宁静'
        }
      ]
    },
    {
      id: 8,
      title: '圣殿中的谦卑',
      subtitle: '真诚的敬拜超越形式',
      sourceId: 'source',
      hint: '恩典看内心不看外表。用真诚打破虚伪，用谦卑击碎自义。',
      theme: 'temple',
      narrative: '圣殿中，有人以仪式自夸，有人以虔诚自居。真正的敬拜需要什么？',
      completionMessage: '自义被谦卑取代，虚伪被真诚融化。圣殿中回荡着真正的敬畏。',
      difficulty: 4,
      connections: 10,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.08,
          allowedTargets: ['*'],
          description: '鉴察人心的主'
        },
        {
          id: 'selfright', name: '自义', type: 'emotion',
          px: 0.15, py: 0.22,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '以自己的标准论断他人'
        },
        {
          id: 'hypocrisy', name: '虚伪', type: 'state',
          px: 0.85, py: 0.22,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '表里不一的表演'
        },
        {
          id: 'ritualism', name: '仪式主义', type: 'state',
          px: 0.35, py: 0.42,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '空有形式的敬拜'
        },
        {
          id: 'weakness', name: '软弱', type: 'emotion',
          px: 0.65, py: 0.42,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue', 'state'],
          description: '承认自己的不足'
        },
        {
          id: 'sincerity', name: '真诚', type: 'action',
          px: 0.1, py: 0.65,
          allowedTargets: ['state', 'emotion'],
          description: '放下伪装，坦诚面对'
        },
        {
          id: 'humility', name: '谦卑', type: 'virtue',
          px: 0.35, py: 0.7,
          allowedTargets: ['emotion', 'state'],
          description: '看别人比自己强'
        },
        {
          id: 'awe', name: '敬畏', type: 'virtue',
          px: 0.65, py: 0.7,
          allowedTargets: ['emotion', 'state'],
          description: '在圣洁面前的敬仰'
        },
        {
          id: 'worship', name: '敬拜', type: 'action',
          px: 0.9, py: 0.65,
          allowedTargets: ['state', 'emotion'],
          description: '心灵诚实的敬拜'
        }
      ]
    },
    {
      id: 9,
      title: '市场上的正义',
      subtitle: '公义与慷慨能改变贪婪',
      sourceId: 'source',
      hint: '恩典在市井中做工，以诚实对抗欺骗，以慷慨胜过贪婪。',
      theme: 'market',
      narrative: '市场上，贪婪和欺骗横行，弱者被剥削。正义的声音能否被听见？',
      completionMessage: '贪婪被慷慨取代，欺骗被诚实揭穿。正义在市场中彰显。',
      difficulty: 4,
      connections: 10,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.08,
          allowedTargets: ['*'],
          description: '公平公正的源头'
        },
        {
          id: 'greed', name: '贪婪', type: 'emotion',
          px: 0.15, py: 0.22,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue', 'state'],
          description: '永不满足的欲望'
        },
        {
          id: 'deception', name: '欺骗', type: 'emotion',
          px: 0.5, py: 0.28,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '以谎言谋取利益'
        },
        {
          id: 'exploit', name: '剥削', type: 'state',
          px: 0.85, py: 0.22,
          blocked: true, unblockers: ['action', 'virtue'],
          allowedTargets: ['virtue'],
          description: '压榨弱者的不公'
        },
        {
          id: 'poverty', name: '贫穷', type: 'state',
          px: 0.3, py: 0.5,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '被剥夺的困境'
        },
        {
          id: 'honesty', name: '诚实', type: 'action',
          px: 0.12, py: 0.68,
          allowedTargets: ['emotion', 'state'],
          description: '在利益面前选择正直'
        },
        {
          id: 'share', name: '分享', type: 'action',
          px: 0.4, py: 0.62,
          allowedTargets: ['state', 'emotion'],
          description: '打开手中的丰盛'
        },
        {
          id: 'justice', name: '公义', type: 'virtue',
          px: 0.7, py: 0.6,
          allowedTargets: ['emotion', 'state'],
          description: '为无声者发声'
        },
        {
          id: 'generosity', name: '慷慨', type: 'virtue',
          px: 0.88, py: 0.72,
          allowedTargets: ['person', 'emotion', 'state'],
          description: '丰盛之心的流露'
        }
      ]
    },
    {
      id: 10,
      title: '港口的归航',
      subtitle: '恩典为每个归来的灵魂预备了家',
      sourceId: 'source',
      hint: '从迷途到归家，恩典一路相伴。悔改是归回的第一步。',
      theme: 'harbor',
      narrative: '远方港口，一个挥霍了所有的人踏上归途。家中父亲仍在等待。这段归航需要多少勇气？',
      completionMessage: '迷途者归家，挥霍者被接纳。港口的灯火不曾熄灭，恩典的怀抱始终敞开。',
      difficulty: 5,
      connections: 12,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.06,
          allowedTargets: ['*'],
          description: '永不放弃等待的父亲'
        },
        {
          id: 'lost', name: '迷途', type: 'state',
          px: 0.18, py: 0.18,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '远离家乡的彷徨'
        },
        {
          id: 'squander', name: '挥霍', type: 'emotion',
          px: 0.82, py: 0.18,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '耗尽一切的放纵'
        },
        {
          id: 'pride2', name: '骄傲', type: 'emotion',
          px: 0.38, py: 0.33,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '不肯低头的倔强'
        },
        {
          id: 'despair', name: '绝望', type: 'state',
          px: 0.62, py: 0.33,
          blocked: true, unblockers: ['action', 'virtue'],
          allowedTargets: ['virtue'],
          description: '山穷水尽的时刻'
        },
        {
          id: 'repent2', name: '悔改', type: 'virtue',
          px: 0.12, py: 0.55,
          allowedTargets: ['emotion', 'state'],
          description: '回转的决心'
        },
        {
          id: 'return2', name: '归回', type: 'action',
          px: 0.35, py: 0.55,
          allowedTargets: ['state', 'emotion'],
          description: '踏上回家的路'
        },
        {
          id: 'accept2', name: '接纳', type: 'virtue',
          px: 0.62, py: 0.55,
          allowedTargets: ['emotion', 'state'],
          description: '张开双臂的拥抱'
        },
        {
          id: 'forgive2', name: '宽恕', type: 'virtue',
          px: 0.88, py: 0.55,
          allowedTargets: ['emotion', 'state'],
          description: '不计前嫌的恩典'
        },
        {
          id: 'home', name: '归家', type: 'virtue',
          px: 0.5, py: 0.82,
          allowedTargets: ['person'],
          description: '浪子回头，恩典满溢'
        }
      ]
    },
    {
      id: 11,
      title: '深渊中的呼求',
      subtitle: '在最深的黑暗中，恩典依然垂听',
      sourceId: 'source',
      hint: '即使跌入深渊，一声呼求也能让恩典降临。交托你的重担。',
      theme: 'abyss',
      narrative: '深渊之中，黑暗与绝望层层叠压。罪疚和羞耻如影随形。但即便在最深处，呼求仍能被听见。',
      completionMessage: '深渊中升起呼求，黑暗被光明驱散。自由属于每一个愿意交托的灵魂。',
      difficulty: 5,
      connections: 12,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.06,
          allowedTargets: ['*'],
          description: '在深渊中仍能触及的恩典'
        },
        {
          id: 'darkness', name: '黑暗', type: 'state',
          px: 0.15, py: 0.2,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '吞噬一切的虚无'
        },
        {
          id: 'despair2', name: '绝望', type: 'emotion',
          px: 0.85, py: 0.2,
          blocked: true, unblockers: ['action', 'virtue'],
          allowedTargets: ['virtue'],
          description: '看不到尽头的痛苦'
        },
        {
          id: 'guilt', name: '罪疚', type: 'emotion',
          px: 0.3, py: 0.38,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '良知的控告'
        },
        {
          id: 'shame', name: '羞耻', type: 'state',
          px: 0.7, py: 0.38,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '无地自容的难堪'
        },
        {
          id: 'cry', name: '呼求', type: 'action',
          px: 0.15, py: 0.6,
          allowedTargets: ['state', 'emotion'],
          description: '从心底发出的呐喊'
        },
        {
          id: 'surrender', name: '交托', type: 'action',
          px: 0.5, py: 0.58,
          allowedTargets: ['state', 'emotion'],
          description: '放下自己，信靠恩典'
        },
        {
          id: 'redemption', name: '救赎', type: 'virtue',
          px: 0.85, py: 0.6,
          allowedTargets: ['emotion', 'state'],
          description: '从奴役中被买回'
        },
        {
          id: 'cleansing', name: '洁净', type: 'virtue',
          px: 0.35, py: 0.78,
          allowedTargets: ['emotion', 'state'],
          description: '洗去一切污秽'
        },
        {
          id: 'freedom', name: '自由', type: 'virtue',
          px: 0.65, py: 0.78,
          allowedTargets: ['person'],
          description: '真理使人得自由'
        }
      ]
    },
    {
      id: 12,
      title: '新天新地',
      subtitle: '一切都更新了',
      sourceId: 'source',
      hint: '恩典最终要更新万物。信心、盼望与爱是通往新造之路。',
      theme: 'kingdom',
      narrative: '旧的世界过去了，一切都要被更新。破碎变为完全，哀恸变为喜乐。这是恩典的终极应许。',
      completionMessage: '旧事已过，都变成新的了。新天新地中，恩典光照万物，荣耀充满全地。',
      difficulty: 5,
      connections: 14,
      nodes: [
        {
          id: 'source', name: '恩典之源', type: 'source',
          px: 0.5, py: 0.05,
          allowedTargets: ['*'],
          description: '使万物更新的主'
        },
        {
          id: 'brokenness', name: '破碎', type: 'state',
          px: 0.12, py: 0.18,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '万物共同的叹息'
        },
        {
          id: 'sorrow', name: '哀恸', type: 'emotion',
          px: 0.5, py: 0.2,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '深藏心底的哀伤'
        },
        {
          id: 'injustice', name: '不义', type: 'state',
          px: 0.88, py: 0.18,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue'],
          description: '世界中蔓延的不公'
        },
        {
          id: 'death', name: '死亡', type: 'state',
          px: 0.28, py: 0.38,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '最后的仇敌'
        },
        {
          id: 'fear2', name: '恐惧', type: 'emotion',
          px: 0.72, py: 0.38,
          blocked: true, unblockers: ['virtue', 'action'],
          allowedTargets: ['virtue'],
          description: '对未知的畏惧'
        },
        {
          id: 'faith', name: '信心', type: 'virtue',
          px: 0.1, py: 0.6,
          allowedTargets: ['emotion', 'state'],
          description: '未见之事的确据'
        },
        {
          id: 'hope2', name: '盼望', type: 'virtue',
          px: 0.35, py: 0.58,
          allowedTargets: ['emotion', 'state'],
          description: '灵魂的锚'
        },
        {
          id: 'love2', name: '爱心', type: 'action',
          px: 0.6, py: 0.58,
          allowedTargets: ['state', 'emotion'],
          description: '最妙的道'
        },
        {
          id: 'renewal', name: '更新', type: 'virtue',
          px: 0.85, py: 0.6,
          allowedTargets: ['emotion', 'state'],
          description: '日日都是新的'
        },
        {
          id: 'glory', name: '荣耀', type: 'virtue',
          px: 0.35, py: 0.8,
          allowedTargets: ['person'],
          description: '恩典的光辉'
        },
        {
          id: 'newcreation', name: '新造', type: 'state',
          px: 0.65, py: 0.82,
          allowedTargets: ['person'],
          description: '旧事已过，都变成新的了'
        }
      ]
    },
    {
      id: 13,
      title: '旷野中的试探',
      subtitle: '孤独中恩典显出力量',
      sourceId: 'source',
      hint: '在旷野中，信心需要经过试炼。用忍耐和盼望穿越黑暗。',
      theme: 'wilderness',
      narrative: '旷野中四十天的孤独，饥饿与试探接踵而来。但正是在最深的荒芜中，恩典显出了它的力量。',
      completionMessage: '旷野的道路虽然艰难，但每一步都有恩典同行。试探过后，你变得比从前更加坚定。',
      difficulty: 4,
      connections: 9,
      nodes: [
        {
          id: 'source', name: '信心', type: 'source',
          px: 0.5, py: 0.08,
          allowedTargets: ['*'],
          description: '旷野中的磐石'
        },
        {
          id: 'doubt', name: '怀疑', type: 'emotion',
          px: 0.15, py: 0.22,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue', 'action'],
          description: '信心的阴影'
        },
        {
          id: 'fear3', name: '恐惧', type: 'emotion',
          px: 0.78, py: 0.2,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue', 'action'],
          description: '对前路的畏惧'
        },
        {
          id: 'temptation', name: '试探', type: 'state',
          px: 0.35, py: 0.38,
          blocked: true, unblockers: ['action'],
          allowedTargets: ['virtue', 'state'],
          description: '三条试探的道路'
        },
        {
          id: 'patience', name: '忍耐', type: 'virtue',
          px: 0.62, py: 0.4,
          allowedTargets: ['emotion', 'state'],
          description: '在患难中也是欢欢喜喜的'
        },
        {
          id: 'hope3', name: '盼望', type: 'virtue',
          px: 0.22, py: 0.58,
          allowedTargets: ['emotion', 'action'],
          description: '灵魂的锚，又坚固又牢靠'
        },
        {
          id: 'peace3', name: '平安', type: 'state',
          px: 0.72, py: 0.6,
          allowedTargets: ['person', 'emotion'],
          description: '出人意外的平安'
        }
      ]
    },
    {
      id: 14,
      title: '迦拿的婚宴',
      subtitle: '匮乏变为丰盛',
      sourceId: 'source',
      hint: '婚宴上的神迹始于一个简单的请求。洁净的水变为美酒，恩典使匮乏变为丰盛。',
      theme: 'wedding',
      narrative: '迦拿的婚宴上，酒用尽了。水变为酒的奇妙作为告诉我们：恩典总能在最不经意的地方，使匮乏变为丰盛。',
      completionMessage: '水变成了酒，最好的留到了最后。恩典的丰盛远超人的想象，在每一个匮乏之处，都有意外的预备。',
      difficulty: 4,
      connections: 11,
      nodes: [
        {
          id: 'source', name: '洁净', type: 'source',
          px: 0.5, py: 0.06,
          allowedTargets: ['*'],
          description: '六口石缸的洁净之水'
        },
        {
          id: 'groom', name: '新郎', type: 'person',
          px: 0.2, py: 0.2,
          allowedTargets: ['person', 'emotion'],
          description: '婚宴的主人'
        },
        {
          id: 'bride', name: '新娘', type: 'person',
          px: 0.78, py: 0.18,
          allowedTargets: ['person', 'emotion'],
          description: '美丽的新娘'
        },
        {
          id: 'guests', name: '宾客', type: 'person',
          px: 0.5, py: 0.3,
          allowedTargets: ['emotion', 'action'],
          description: '赴宴的众人'
        },
        {
          id: 'watertowine', name: '水变为酒', type: 'action',
          px: 0.28, py: 0.48,
          blocked: true, unblockers: ['person'],
          allowedTargets: ['virtue', 'emotion'],
          description: '头一件神迹'
        },
        {
          id: 'joy', name: '欢庆', type: 'emotion',
          px: 0.72, py: 0.48,
          allowedTargets: ['virtue', 'state'],
          description: '满心欢喜'
        },
        {
          id: 'covenant', name: '盟约', type: 'virtue',
          px: 0.35, py: 0.68,
          allowedTargets: ['state', 'person'],
          description: '永不毁坏的约'
        },
        {
          id: 'blessing', name: '祝福', type: 'state',
          px: 0.65, py: 0.7,
          allowedTargets: ['person', 'emotion'],
          description: '恩典的赐福'
        }
      ]
    },
    {
      id: 15,
      title: '新天新地',
      subtitle: '永恒的恩典之城',
      sourceId: 'source',
      hint: '一切眼泪被擦干，死亡不再有权势。羔羊是这城的灯，恩典成就了最终的合一。',
      theme: 'eternity',
      narrative: '一切眼泪被擦干，死亡不再有权势，恩典成就了最终的合一。新耶路撒冷从天而降，神亲自与人同住，直到永远。',
      completionMessage: '不再有死亡，也不再有悲哀、哭号、疼痛。因为以前的事都过去了。坐宝座的说：看哪，我将一切都更新了。',
      difficulty: 5,
      connections: 14,
      nodes: [
        {
          id: 'source', name: '羔羊', type: 'source',
          px: 0.5, py: 0.05,
          allowedTargets: ['*'],
          description: '城的殿就是羔羊'
        },
        {
          id: 'newjerusalem', name: '新耶路撒冷', type: 'state',
          px: 0.18, py: 0.18,
          allowedTargets: ['virtue', 'state'],
          description: '从天而降的圣城'
        },
        {
          id: 'river', name: '生命河', type: 'action',
          px: 0.5, py: 0.2,
          allowedTargets: ['emotion', 'virtue', 'state'],
          description: '明亮如水晶的生命水'
        },
        {
          id: 'tree', name: '生命树', type: 'virtue',
          px: 0.82, py: 0.18,
          allowedTargets: ['emotion', 'state'],
          description: '每月都结果子'
        },
        {
          id: 'notears', name: '不再哭泣', type: 'emotion',
          px: 0.2, py: 0.4,
          allowedTargets: ['virtue', 'state'],
          description: '神擦去一切眼泪'
        },
        {
          id: 'nodeath', name: '不再死亡', type: 'state',
          px: 0.5, py: 0.42,
          blocked: true, unblockers: ['virtue'],
          allowedTargets: ['virtue'],
          description: '最后的仇敌已被毁灭'
        },
        {
          id: 'godwithus', name: '神同住', type: 'virtue',
          px: 0.8, py: 0.4,
          allowedTargets: ['emotion', 'state'],
          description: '神的帐幕在人间'
        },
        {
          id: 'eternallight', name: '永恒之光', type: 'state',
          px: 0.25, py: 0.62,
          allowedTargets: ['virtue', 'person'],
          description: '不用日月光照'
        },
        {
          id: 'renewall', name: '全然更新', type: 'action',
          px: 0.65, py: 0.6,
          blocked: true, unblockers: ['virtue', 'state'],
          allowedTargets: ['emotion', 'virtue'],
          description: '一切都更新了'
        },
        {
          id: 'glory2', name: '永恒荣耀', type: 'virtue',
          px: 0.45, py: 0.82,
          allowedTargets: ['person', 'state'],
          description: '城里有神的荣耀'
        }
      ]
    }
  ];

  function getLevel(index) {
    var levelDef = LEVELS[index];
    if (!levelDef) return null;

    var w = CanvasEngine.width / (window.devicePixelRatio || 1);
    var h = CanvasEngine.height / (window.devicePixelRatio || 1);

    // Check for narrow screen — use more spread vertical layout
    var isNarrow = w < 400;

    // Copy level and convert percentage positions to pixels
    var level = {
      id: levelDef.id,
      title: levelDef.title,
      subtitle: levelDef.subtitle,
      sourceId: levelDef.sourceId,
      hint: levelDef.hint,
      theme: levelDef.theme || 'default',
      narrative: levelDef.narrative || '',
      completionMessage: levelDef.completionMessage || '',
      difficulty: levelDef.difficulty || 1,
      connections: levelDef.connections || 0,
      nodes: []
    };

    for (var i = 0; i < levelDef.nodes.length; i++) {
      var nd = levelDef.nodes[i];
      var px = nd.px;
      var py = nd.py;

      // Narrow screen adjustment: spread nodes more vertically
      if (isNarrow && nd.type !== 'source') {
        px = 0.3 + (nd.px - 0.2) * 0.5;
        py = Math.min(0.85, py + 0.03);
      }

      level.nodes.push({
        id: nd.id,
        name: nd.name,
        type: nd.type,
        description: nd.description || '',
        x: px * w,
        y: py * h,
        blocked: nd.blocked || false,
        unblockers: nd.unblockers ? nd.unblockers.slice() : [],
        allowedTargets: nd.allowedTargets ? nd.allowedTargets.slice() : []
      });
    }

    return level;
  }

  return {
    LEVELS: LEVELS,
    THEME_COLORS: THEME_COLORS,
    getLevel: getLevel,
    get total() { return LEVELS.length; }
  };
})();

export const wl = {
  name: 'lnru100',
  src:
    `
    (rule [Reachable x y]
      [Link x y])
      
    (rule [Reachable x y]
      [Link x z] [Reachable z y])
    
    (rule [Node x]
      [Link x _])
      
    (rule [Node y]
      [Link _ y])
    
    (rule [Unreachable x y]
      [Node x] [Node y] (not [Reachable x y]))
    
    `,
  moduleCb(module)
  {
    const t0 = new module.Link(17, 14)
    const t1 = new module.Link(13, 14)
    const t2 = new module.Link(7, 3)
    const t3 = new module.Link(1, 1)
    const t4 = new module.Link(3, 20)
    const t5 = new module.Link(3, 11)
    const t6 = new module.Link(7, 13)
    const t7 = new module.Link(12, 5)
    const t8 = new module.Link(9, 14)
    const t9 = new module.Link(6, 11)
    const t10 = new module.Link(16, 11)
    const t11 = new module.Link(3, 17)
    const t12 = new module.Link(8, 11)
    const t13 = new module.Link(9, 1)
    const t14 = new module.Link(3, 16)
    const t15 = new module.Link(5, 17)
    const t16 = new module.Link(14, 19)
    const t17 = new module.Link(10, 14)
    const t18 = new module.Link(8, 16)
    const t19 = new module.Link(17, 6)
    const t20 = new module.Link(15, 15)
    const t21 = new module.Link(13, 18)
    const t22 = new module.Link(1, 17)
    const t23 = new module.Link(6, 16)
    const t24 = new module.Link(11, 15)
    const t25 = new module.Link(15, 13)
    const t26 = new module.Link(14, 8)
    const t27 = new module.Link(14, 2)
    const t28 = new module.Link(15, 14)
    const t29 = new module.Link(20, 13)
    const t30 = new module.Link(18, 5)
    const t31 = new module.Link(13, 7)
    const t32 = new module.Link(5, 11)
    const t33 = new module.Link(12, 16)
    const t34 = new module.Link(4, 10)
    const t35 = new module.Link(7, 17)
    const t36 = new module.Link(14, 17)
    const t37 = new module.Link(2, 18)
    const t38 = new module.Link(9, 7)
    const t39 = new module.Link(17, 19)
    const t40 = new module.Link(14, 6)
    const t41 = new module.Link(7, 12)
    const t42 = new module.Link(15, 19)
    const t43 = new module.Link(15, 2)
    const t44 = new module.Link(16, 4)
    const t45 = new module.Link(2, 13)
    const t46 = new module.Link(6, 9)
    const t47 = new module.Link(8, 19)
    const t48 = new module.Link(17, 10)
    const t49 = new module.Link(5, 15)
    const t50 = new module.Link(1, 4)
    const t51 = new module.Link(14, 18)
    const t52 = new module.Link(15, 20)
    const t53 = new module.Link(17, 15)
    const t54 = new module.Link(7, 20)
    const t55 = new module.Link(11, 9)
    const t56 = new module.Link(14, 15)
    const t57 = new module.Link(17, 7)
    const t58 = new module.Link(1, 13)
    const t59 = new module.Link(5, 18)
    const t60 = new module.Link(7, 11)
    const t61 = new module.Link(11, 17)
    const t62 = new module.Link(11, 5)
    const t63 = new module.Link(15, 6)
    const t64 = new module.Link(6, 10)
    const t65 = new module.Link(15, 5)
    const t66 = new module.Link(19, 11)
    const t67 = new module.Link(20, 8)
    const t68 = new module.Link(4, 4)
    const t69 = new module.Link(8, 12)
    const t70 = new module.Link(15, 9)
    const t71 = new module.Link(13, 17)
    const t72 = new module.Link(6, 2)
    const t73 = new module.Link(18, 18)
    const t74 = new module.Link(17, 12)
    const t75 = new module.Link(19, 9)
    const t76 = new module.Link(14, 3)
    const t77 = new module.Link(19, 16)
    const t78 = new module.Link(20, 10)
    const t79 = new module.Link(16, 2)
    const t80 = new module.Link(7, 9)
    const t81 = new module.Link(8, 6)
    const t82 = new module.Link(11, 1)
    const t83 = new module.Link(2, 12)
    const t84 = new module.Link(3, 4)
    const t85 = new module.Link(16, 12)
    const t86 = new module.Link(11, 13)
    const t87 = new module.Link(2, 8)
    const t88 = new module.Link(8, 2)
    const t89 = new module.Link(16, 6)
    const t90 = new module.Link(5, 20)
    const t91 = new module.Link(10, 7)
    const t92 = new module.Link(14, 16)
    const t93 = new module.Link(19, 19)
    const t94 = new module.Link(9, 6)
    const t95 = new module.Link(16, 20)
    const t96 = new module.Link(2, 5)
    const t97 = new module.Link(11, 16)
    const t98 = new module.Link(10, 11)
    const t99 = new module.Link(16, 8)
    module.addTupleMap(new Map([[module.Link, [t0]]]));
    module.addTupleMap(new Map([[module.Link, [t1]]]));
    module.addTupleMap(new Map([[module.Link, [t2]]]));
    module.addTupleMap(new Map([[module.Link, [t3]]]));
    module.addTupleMap(new Map([[module.Link, [t4]]]));
    module.addTupleMap(new Map([[module.Link, [t5]]]));
    module.addTupleMap(new Map([[module.Link, [t6]]]));
    module.addTupleMap(new Map([[module.Link, [t7]]]));
    module.addTupleMap(new Map([[module.Link, [t8]]]));
    module.addTupleMap(new Map([[module.Link, [t9]]]));
    module.addTupleMap(new Map([[module.Link, [t10]]]));
    module.addTupleMap(new Map([[module.Link, [t11]]]));
    module.addTupleMap(new Map([[module.Link, [t12]]]));
    module.removeTuples([t6]);
    module.addTupleMap(new Map([[module.Link, [t13]]]));
    module.addTupleMap(new Map([[module.Link, [t14]]]));
    module.removeTuples([t14]);
    module.addTupleMap(new Map([[module.Link, [t15]]]));
    module.removeTuples([t0]);
    module.addTupleMap(new Map([[module.Link, [t16]]]));
    module.addTupleMap(new Map([[module.Link, [t17]]]));
    module.addTupleMap(new Map([[module.Link, [t18]]]));
    module.removeTuples([t12]);
    module.removeTuples([t9]);
    module.addTupleMap(new Map([[module.Link, [t19]]]));
    module.removeTuples([t8]);
    module.addTupleMap(new Map([[module.Link, [t20]]]));
    module.removeTuples([t4]);
    module.removeTuples([t2]);
    module.removeTuples([t11]);
    module.addTupleMap(new Map([[module.Link, [t21]]]));
    module.removeTuples([t7]);
    module.addTupleMap(new Map([[module.Link, [t22]]]));
    module.addTupleMap(new Map([[module.Link, [t23]]]));
    module.removeTuples([t21]);
    module.addTupleMap(new Map([[module.Link, [t24]]]));
    module.addTupleMap(new Map([[module.Link, [t25]]]));
    module.addTupleMap(new Map([[module.Link, [t26]]]));
    module.removeTuples([t16]);
    module.removeTuples([t13]);
    module.removeTuples([t5]);
    module.removeTuples([t15]);
    module.removeTuples([t25]);
    module.removeTuples([t3]);
    module.addTupleMap(new Map([[module.Link, [t27]]]));
    module.addTupleMap(new Map([[module.Link, [t28]]]));
    module.addTupleMap(new Map([[module.Link, [t29]]]));
    module.removeTuples([t27]);
    module.removeTuples([t10]);
    module.removeTuples([t24]);
    module.addTupleMap(new Map([[module.Link, [t30]]]));
    module.removeTuples([t30]);
    module.addTupleMap(new Map([[module.Link, [t31]]]));
    module.removeTuples([t22]);
    module.addTupleMap(new Map([[module.Link, [t32]]]));
    module.removeTuples([t19]);
    module.addTupleMap(new Map([[module.Link, [t33]]]));
    module.addTupleMap(new Map([[module.Link, [t34]]]));
    module.addTupleMap(new Map([[module.Link, [t35]]]));
    module.removeTuples([t31]);
    module.removeTuples([t20]);
    module.addTupleMap(new Map([[module.Link, [t36]]]));
    module.removeTuples([t17]);
    module.addTupleMap(new Map([[module.Link, [t37]]]));
    module.removeTuples([t33]);
    module.removeTuples([t32]);
    module.addTupleMap(new Map([[module.Link, [t38]]]));
    module.removeTuples([t37]);
    module.addTupleMap(new Map([[module.Link, [t39]]]));
    module.addTupleMap(new Map([[module.Link, [t40]]]));
    module.addTupleMap(new Map([[module.Link, [t41]]]));
    module.addTupleMap(new Map([[module.Link, [t42]]]));
    module.addTupleMap(new Map([[module.Link, [t43]]]));
    module.removeTuples([t26]);
    module.addTupleMap(new Map([[module.Link, [t44]]]));
    module.addTupleMap(new Map([[module.Link, [t45]]]));
    module.addTupleMap(new Map([[module.Link, [t46]]]));
    module.addTupleMap(new Map([[module.Link, [t47]]]));
    module.addTupleMap(new Map([[module.Link, [t48]]]));
    module.addTupleMap(new Map([[module.Link, [t49]]]));
    module.removeTuples([t40]);
    module.addTupleMap(new Map([[module.Link, [t50]]]));
    module.addTupleMap(new Map([[module.Link, [t51]]]));
    module.removeTuples([t39]);
    module.addTupleMap(new Map([[module.Link, [t52]]]));
    module.addTupleMap(new Map([[module.Link, [t53]]]));
    module.removeTuples([t48]);
    module.addTupleMap(new Map([[module.Link, [t54]]]));
    module.removeTuples([t53]);
    module.addTupleMap(new Map([[module.Link, [t55]]]));
    module.removeTuples([t55]);
    module.addTupleMap(new Map([[module.Link, [t56]]]));
    module.addTupleMap(new Map([[module.Link, [t57]]]));
    module.removeTuples([t35]);
    module.removeTuples([t49]);
    module.addTupleMap(new Map([[module.Link, [t58]]]));
    module.addTupleMap(new Map([[module.Link, [t59]]]));
    module.addTupleMap(new Map([[module.Link, [t60]]]));
    module.removeTuples([t38]);
    module.addTupleMap(new Map([[module.Link, [t61]]]));
    module.removeTuples([t51]);
    module.addTupleMap(new Map([[module.Link, [t62]]]));
    module.addTupleMap(new Map([[module.Link, [t63]]]));
    module.removeTuples([t1]);
    module.removeTuples([t41]);
    module.addTupleMap(new Map([[module.Link, [t64]]]));
    module.addTupleMap(new Map([[module.Link, [t65]]]));
    module.removeTuples([t65]);
    module.removeTuples([t34]);
    module.removeTuples([t43]);
    module.addTupleMap(new Map([[module.Link, [t66]]]));
    module.addTupleMap(new Map([[module.Link, [t67]]]));
    module.addTupleMap(new Map([[module.Link, [t68]]]));
    module.addTupleMap(new Map([[module.Link, [t69]]]));
    module.addTupleMap(new Map([[module.Link, [t70]]]));
    module.addTupleMap(new Map([[module.Link, [t71]]]));
    module.removeTuples([t56]);
    module.removeTuples([t46]);
    module.removeTuples([t58]);
    module.addTupleMap(new Map([[module.Link, [t72]]]));
    module.removeTuples([t54]);
    module.addTupleMap(new Map([[module.Link, [t73]]]));
    module.addTupleMap(new Map([[module.Link, [t74]]]));
    module.removeTuples([t67]);
    module.addTupleMap(new Map([[module.Link, [t75]]]));
    module.removeTuples([t59]);
    module.removeTuples([t72]);
    module.addTupleMap(new Map([[module.Link, [t76]]]));
    module.removeTuples([t75]);
    module.addTupleMap(new Map([[module.Link, [t77]]]));
    module.addTupleMap(new Map([[module.Link, [t78]]]));
    module.removeTuples([t52]);
    module.removeTuples([t68]);
    module.removeTuples([t57]);
    module.removeTuples([t78]);
    module.removeTuples([t60]);
    module.addTupleMap(new Map([[module.Link, [t79]]]));
    module.addTupleMap(new Map([[module.Link, [t80]]]));
    module.removeTuples([t80]);
    module.removeTuples([t77]);
    module.removeTuples([t76]);
    module.removeTuples([t71]);
    module.addTupleMap(new Map([[module.Link, [t81]]]));
    module.addTupleMap(new Map([[module.Link, [t82]]]));
    module.addTupleMap(new Map([[module.Link, [t83]]]));
    module.removeTuples([t74]);
    module.addTupleMap(new Map([[module.Link, [t84]]]));
    module.removeTuples([t18]);
    module.removeTuples([t70]);
    module.addTupleMap(new Map([[module.Link, [t85]]]));
    module.removeTuples([t66]);
    module.removeTuples([t79]);
    module.removeTuples([t44]);
    module.removeTuples([t61]);
    module.removeTuples([t45]);
    module.addTupleMap(new Map([[module.Link, [t86]]]));
    module.addTupleMap(new Map([[module.Link, [t87]]]));
    module.addTupleMap(new Map([[module.Link, [t88]]]));
    module.addTupleMap(new Map([[module.Link, [t89]]]));
    module.addTupleMap(new Map([[module.Link, [t90]]]));
    module.removeTuples([t47]);
    module.addTupleMap(new Map([[module.Link, [t91]]]));
    module.addTupleMap(new Map([[module.Link, [t92]]]));
    module.removeTuples([t84]);
    module.removeTuples([t62]);
    module.addTupleMap(new Map([[module.Link, [t93]]]));
    module.addTupleMap(new Map([[module.Link, [t94]]]));
    module.addTupleMap(new Map([[module.Link, [t95]]]));
    module.removeTuples([t64]);
    module.addTupleMap(new Map([[module.Link, [t96]]]));
    module.addTupleMap(new Map([[module.Link, [t97]]]));
    module.addTupleMap(new Map([[module.Link, [t98]]]));
    module.addTupleMap(new Map([[module.Link, [t99]]]));
    module.removeTuples([t99]);
    module.removeTuples([t98]);
    module.removeTuples([t97]);
    module.removeTuples([t96]);
    module.removeTuples([t95]);
    module.removeTuples([t94]);
    module.removeTuples([t93]);
    module.removeTuples([t92]);
    module.removeTuples([t91]);
    module.removeTuples([t90]);
    module.removeTuples([t89]);
    module.removeTuples([t88]);
    module.removeTuples([t87]);
    module.removeTuples([t86]);
    module.removeTuples([t85]);
    module.removeTuples([t83]);
    module.removeTuples([t82]);
    module.removeTuples([t81]);
    module.removeTuples([t73]);
    module.removeTuples([t69]);
    module.removeTuples([t63]);
    module.removeTuples([t50]);
    module.removeTuples([t42]);
    module.removeTuples([t36]);
    module.removeTuples([t29]);
    module.removeTuples([t28]);
    module.removeTuples([t23]);
  }
}
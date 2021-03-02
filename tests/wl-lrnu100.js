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
    const t0 = ['Link', 17, 14]
    const t1 = ['Link', 13, 14]
    const t2 = ['Link', 7, 3]
    const t3 = ['Link', 1, 1]
    const t4 = ['Link', 3, 20]
    const t5 = ['Link', 3, 11]
    const t6 = ['Link', 7, 13]
    const t7 = ['Link', 12, 5]
    const t8 = ['Link', 9, 14]
    const t9 = ['Link', 6, 11]
    const t10 = ['Link', 16, 11]
    const t11 = ['Link', 3, 17]
    const t12 = ['Link', 8, 11]
    const t13 = ['Link', 9, 1]
    const t14 = ['Link', 3, 16]
    const t15 = ['Link', 5, 17]
    const t16 = ['Link', 14, 19]
    const t17 = ['Link', 10, 14]
    const t18 = ['Link', 8, 16]
    const t19 = ['Link', 17, 6]
    const t20 = ['Link', 15, 15]
    const t21 = ['Link', 13, 18]
    const t22 = ['Link', 1, 17]
    const t23 = ['Link', 6, 16]
    const t24 = ['Link', 11, 15]
    const t25 = ['Link', 15, 13]
    const t26 = ['Link', 14, 8]
    const t27 = ['Link', 14, 2]
    const t28 = ['Link', 15, 14]
    const t29 = ['Link', 20, 13]
    const t30 = ['Link', 18, 5]
    const t31 = ['Link', 13, 7]
    const t32 = ['Link', 5, 11]
    const t33 = ['Link', 12, 16]
    const t34 = ['Link', 4, 10]
    const t35 = ['Link', 7, 17]
    const t36 = ['Link', 14, 17]
    const t37 = ['Link', 2, 18]
    const t38 = ['Link', 9, 7]
    const t39 = ['Link', 17, 19]
    const t40 = ['Link', 14, 6]
    const t41 = ['Link', 7, 12]
    const t42 = ['Link', 15, 19]
    const t43 = ['Link', 15, 2]
    const t44 = ['Link', 16, 4]
    const t45 = ['Link', 2, 13]
    const t46 = ['Link', 6, 9]
    const t47 = ['Link', 8, 19]
    const t48 = ['Link', 17, 10]
    const t49 = ['Link', 5, 15]
    const t50 = ['Link', 1, 4]
    const t51 = ['Link', 14, 18]
    const t52 = ['Link', 15, 20]
    const t53 = ['Link', 17, 15]
    const t54 = ['Link', 7, 20]
    const t55 = ['Link', 11, 9]
    const t56 = ['Link', 14, 15]
    const t57 = ['Link', 17, 7]
    const t58 = ['Link', 1, 13]
    const t59 = ['Link', 5, 18]
    const t60 = ['Link', 7, 11]
    const t61 = ['Link', 11, 17]
    const t62 = ['Link', 11, 5]
    const t63 = ['Link', 15, 6]
    const t64 = ['Link', 6, 10]
    const t65 = ['Link', 15, 5]
    const t66 = ['Link', 19, 11]
    const t67 = ['Link', 20, 8]
    const t68 = ['Link', 4, 4]
    const t69 = ['Link', 8, 12]
    const t70 = ['Link', 15, 9]
    const t71 = ['Link', 13, 17]
    const t72 = ['Link', 6, 2]
    const t73 = ['Link', 18, 18]
    const t74 = ['Link', 17, 12]
    const t75 = ['Link', 19, 9]
    const t76 = ['Link', 14, 3]
    const t77 = ['Link', 19, 16]
    const t78 = ['Link', 20, 10]
    const t79 = ['Link', 16, 2]
    const t80 = ['Link', 7, 9]
    const t81 = ['Link', 8, 6]
    const t82 = ['Link', 11, 1]
    const t83 = ['Link', 2, 12]
    const t84 = ['Link', 3, 4]
    const t85 = ['Link', 16, 12]
    const t86 = ['Link', 11, 13]
    const t87 = ['Link', 2, 8]
    const t88 = ['Link', 8, 2]
    const t89 = ['Link', 16, 6]
    const t90 = ['Link', 5, 20]
    const t91 = ['Link', 10, 7]
    const t92 = ['Link', 14, 16]
    const t93 = ['Link', 19, 19]
    const t94 = ['Link', 9, 6]
    const t95 = ['Link', 16, 20]
    const t96 = ['Link', 2, 5]
    const t97 = ['Link', 11, 16]
    const t98 = ['Link', 10, 11]
    const t99 = ['Link', 16, 8]
    module.addTupleMap(new Map([['Link', [t0]]]));
    module.addTupleMap(new Map([['Link', [t1]]]));
    module.addTupleMap(new Map([['Link', [t2]]]));
    module.addTupleMap(new Map([['Link', [t3]]]));
    module.addTupleMap(new Map([['Link', [t4]]]));
    module.addTupleMap(new Map([['Link', [t5]]]));
    module.addTupleMap(new Map([['Link', [t6]]]));
    module.addTupleMap(new Map([['Link', [t7]]]));
    module.addTupleMap(new Map([['Link', [t8]]]));
    module.addTupleMap(new Map([['Link', [t9]]]));
    module.addTupleMap(new Map([['Link', [t10]]]));
    module.addTupleMap(new Map([['Link', [t11]]]));
    module.addTupleMap(new Map([['Link', [t12]]]));
    module.removeTuples([t6]);
    module.addTupleMap(new Map([['Link', [t13]]]));
    module.addTupleMap(new Map([['Link', [t14]]]));
    module.removeTuples([t14]);
    module.addTupleMap(new Map([['Link', [t15]]]));
    module.removeTuples([t0]);
    module.addTupleMap(new Map([['Link', [t16]]]));
    module.addTupleMap(new Map([['Link', [t17]]]));
    module.addTupleMap(new Map([['Link', [t18]]]));
    module.removeTuples([t12]);
    module.removeTuples([t9]);
    module.addTupleMap(new Map([['Link', [t19]]]));
    module.removeTuples([t8]);
    module.addTupleMap(new Map([['Link', [t20]]]));
    module.removeTuples([t4]);
    module.removeTuples([t2]);
    module.removeTuples([t11]);
    module.addTupleMap(new Map([['Link', [t21]]]));
    module.removeTuples([t7]);
    module.addTupleMap(new Map([['Link', [t22]]]));
    module.addTupleMap(new Map([['Link', [t23]]]));
    module.removeTuples([t21]);
    module.addTupleMap(new Map([['Link', [t24]]]));
    module.addTupleMap(new Map([['Link', [t25]]]));
    module.addTupleMap(new Map([['Link', [t26]]]));
    module.removeTuples([t16]);
    module.removeTuples([t13]);
    module.removeTuples([t5]);
    module.removeTuples([t15]);
    module.removeTuples([t25]);
    module.removeTuples([t3]);
    module.addTupleMap(new Map([['Link', [t27]]]));
    module.addTupleMap(new Map([['Link', [t28]]]));
    module.addTupleMap(new Map([['Link', [t29]]]));
    module.removeTuples([t27]);
    module.removeTuples([t10]);
    module.removeTuples([t24]);
    module.addTupleMap(new Map([['Link', [t30]]]));
    module.removeTuples([t30]);
    module.addTupleMap(new Map([['Link', [t31]]]));
    module.removeTuples([t22]);
    module.addTupleMap(new Map([['Link', [t32]]]));
    module.removeTuples([t19]);
    module.addTupleMap(new Map([['Link', [t33]]]));
    module.addTupleMap(new Map([['Link', [t34]]]));
    module.addTupleMap(new Map([['Link', [t35]]]));
    module.removeTuples([t31]);
    module.removeTuples([t20]);
    module.addTupleMap(new Map([['Link', [t36]]]));
    module.removeTuples([t17]);
    module.addTupleMap(new Map([['Link', [t37]]]));
    module.removeTuples([t33]);
    module.removeTuples([t32]);
    module.addTupleMap(new Map([['Link', [t38]]]));
    module.removeTuples([t37]);
    module.addTupleMap(new Map([['Link', [t39]]]));
    module.addTupleMap(new Map([['Link', [t40]]]));
    module.addTupleMap(new Map([['Link', [t41]]]));
    module.addTupleMap(new Map([['Link', [t42]]]));
    module.addTupleMap(new Map([['Link', [t43]]]));
    module.removeTuples([t26]);
    module.addTupleMap(new Map([['Link', [t44]]]));
    module.addTupleMap(new Map([['Link', [t45]]]));
    module.addTupleMap(new Map([['Link', [t46]]]));
    module.addTupleMap(new Map([['Link', [t47]]]));
    module.addTupleMap(new Map([['Link', [t48]]]));
    module.addTupleMap(new Map([['Link', [t49]]]));
    module.removeTuples([t40]);
    module.addTupleMap(new Map([['Link', [t50]]]));
    module.addTupleMap(new Map([['Link', [t51]]]));
    module.removeTuples([t39]);
    module.addTupleMap(new Map([['Link', [t52]]]));
    module.addTupleMap(new Map([['Link', [t53]]]));
    module.removeTuples([t48]);
    module.addTupleMap(new Map([['Link', [t54]]]));
    module.removeTuples([t53]);
    module.addTupleMap(new Map([['Link', [t55]]]));
    module.removeTuples([t55]);
    module.addTupleMap(new Map([['Link', [t56]]]));
    module.addTupleMap(new Map([['Link', [t57]]]));
    module.removeTuples([t35]);
    module.removeTuples([t49]);
    module.addTupleMap(new Map([['Link', [t58]]]));
    module.addTupleMap(new Map([['Link', [t59]]]));
    module.addTupleMap(new Map([['Link', [t60]]]));
    module.removeTuples([t38]);
    module.addTupleMap(new Map([['Link', [t61]]]));
    module.removeTuples([t51]);
    module.addTupleMap(new Map([['Link', [t62]]]));
    module.addTupleMap(new Map([['Link', [t63]]]));
    module.removeTuples([t1]);
    module.removeTuples([t41]);
    module.addTupleMap(new Map([['Link', [t64]]]));
    module.addTupleMap(new Map([['Link', [t65]]]));
    module.removeTuples([t65]);
    module.removeTuples([t34]);
    module.removeTuples([t43]);
    module.addTupleMap(new Map([['Link', [t66]]]));
    module.addTupleMap(new Map([['Link', [t67]]]));
    module.addTupleMap(new Map([['Link', [t68]]]));
    module.addTupleMap(new Map([['Link', [t69]]]));
    module.addTupleMap(new Map([['Link', [t70]]]));
    module.addTupleMap(new Map([['Link', [t71]]]));
    module.removeTuples([t56]);
    module.removeTuples([t46]);
    module.removeTuples([t58]);
    module.addTupleMap(new Map([['Link', [t72]]]));
    module.removeTuples([t54]);
    module.addTupleMap(new Map([['Link', [t73]]]));
    module.addTupleMap(new Map([['Link', [t74]]]));
    module.removeTuples([t67]);
    module.addTupleMap(new Map([['Link', [t75]]]));
    module.removeTuples([t59]);
    module.removeTuples([t72]);
    module.addTupleMap(new Map([['Link', [t76]]]));
    module.removeTuples([t75]);
    module.addTupleMap(new Map([['Link', [t77]]]));
    module.addTupleMap(new Map([['Link', [t78]]]));
    module.removeTuples([t52]);
    module.removeTuples([t68]);
    module.removeTuples([t57]);
    module.removeTuples([t78]);
    module.removeTuples([t60]);
    module.addTupleMap(new Map([['Link', [t79]]]));
    module.addTupleMap(new Map([['Link', [t80]]]));
    module.removeTuples([t80]);
    module.removeTuples([t77]);
    module.removeTuples([t76]);
    module.removeTuples([t71]);
    module.addTupleMap(new Map([['Link', [t81]]]));
    module.addTupleMap(new Map([['Link', [t82]]]));
    module.addTupleMap(new Map([['Link', [t83]]]));
    module.removeTuples([t74]);
    module.addTupleMap(new Map([['Link', [t84]]]));
    module.removeTuples([t18]);
    module.removeTuples([t70]);
    module.addTupleMap(new Map([['Link', [t85]]]));
    module.removeTuples([t66]);
    module.removeTuples([t79]);
    module.removeTuples([t44]);
    module.removeTuples([t61]);
    module.removeTuples([t45]);
    module.addTupleMap(new Map([['Link', [t86]]]));
    module.addTupleMap(new Map([['Link', [t87]]]));
    module.addTupleMap(new Map([['Link', [t88]]]));
    module.addTupleMap(new Map([['Link', [t89]]]));
    module.addTupleMap(new Map([['Link', [t90]]]));
    module.removeTuples([t47]);
    module.addTupleMap(new Map([['Link', [t91]]]));
    module.addTupleMap(new Map([['Link', [t92]]]));
    module.removeTuples([t84]);
    module.removeTuples([t62]);
    module.addTupleMap(new Map([['Link', [t93]]]));
    module.addTupleMap(new Map([['Link', [t94]]]));
    module.addTupleMap(new Map([['Link', [t95]]]));
    module.removeTuples([t64]);
    module.addTupleMap(new Map([['Link', [t96]]]));
    module.addTupleMap(new Map([['Link', [t97]]]));
    module.addTupleMap(new Map([['Link', [t98]]]));
    module.addTupleMap(new Map([['Link', [t99]]]));
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
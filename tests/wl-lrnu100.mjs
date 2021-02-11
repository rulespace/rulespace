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
    module.add_tuple_map(new Map([[module.Link, [t0]]]));
    module.add_tuple_map(new Map([[module.Link, [t1]]]));
    module.add_tuple_map(new Map([[module.Link, [t2]]]));
    module.add_tuple_map(new Map([[module.Link, [t3]]]));
    module.add_tuple_map(new Map([[module.Link, [t4]]]));
    module.add_tuple_map(new Map([[module.Link, [t5]]]));
    module.add_tuple_map(new Map([[module.Link, [t6]]]));
    module.add_tuple_map(new Map([[module.Link, [t7]]]));
    module.add_tuple_map(new Map([[module.Link, [t8]]]));
    module.add_tuple_map(new Map([[module.Link, [t9]]]));
    module.add_tuple_map(new Map([[module.Link, [t10]]]));
    module.add_tuple_map(new Map([[module.Link, [t11]]]));
    module.add_tuple_map(new Map([[module.Link, [t12]]]));
    module.remove_tuples([t6]);
    module.add_tuple_map(new Map([[module.Link, [t13]]]));
    module.add_tuple_map(new Map([[module.Link, [t14]]]));
    module.remove_tuples([t14]);
    module.add_tuple_map(new Map([[module.Link, [t15]]]));
    module.remove_tuples([t0]);
    module.add_tuple_map(new Map([[module.Link, [t16]]]));
    module.add_tuple_map(new Map([[module.Link, [t17]]]));
    module.add_tuple_map(new Map([[module.Link, [t18]]]));
    module.remove_tuples([t12]);
    module.remove_tuples([t9]);
    module.add_tuple_map(new Map([[module.Link, [t19]]]));
    module.remove_tuples([t8]);
    module.add_tuple_map(new Map([[module.Link, [t20]]]));
    module.remove_tuples([t4]);
    module.remove_tuples([t2]);
    module.remove_tuples([t11]);
    module.add_tuple_map(new Map([[module.Link, [t21]]]));
    module.remove_tuples([t7]);
    module.add_tuple_map(new Map([[module.Link, [t22]]]));
    module.add_tuple_map(new Map([[module.Link, [t23]]]));
    module.remove_tuples([t21]);
    module.add_tuple_map(new Map([[module.Link, [t24]]]));
    module.add_tuple_map(new Map([[module.Link, [t25]]]));
    module.add_tuple_map(new Map([[module.Link, [t26]]]));
    module.remove_tuples([t16]);
    module.remove_tuples([t13]);
    module.remove_tuples([t5]);
    module.remove_tuples([t15]);
    module.remove_tuples([t25]);
    module.remove_tuples([t3]);
    module.add_tuple_map(new Map([[module.Link, [t27]]]));
    module.add_tuple_map(new Map([[module.Link, [t28]]]));
    module.add_tuple_map(new Map([[module.Link, [t29]]]));
    module.remove_tuples([t27]);
    module.remove_tuples([t10]);
    module.remove_tuples([t24]);
    module.add_tuple_map(new Map([[module.Link, [t30]]]));
    module.remove_tuples([t30]);
    module.add_tuple_map(new Map([[module.Link, [t31]]]));
    module.remove_tuples([t22]);
    module.add_tuple_map(new Map([[module.Link, [t32]]]));
    module.remove_tuples([t19]);
    module.add_tuple_map(new Map([[module.Link, [t33]]]));
    module.add_tuple_map(new Map([[module.Link, [t34]]]));
    module.add_tuple_map(new Map([[module.Link, [t35]]]));
    module.remove_tuples([t31]);
    module.remove_tuples([t20]);
    module.add_tuple_map(new Map([[module.Link, [t36]]]));
    module.remove_tuples([t17]);
    module.add_tuple_map(new Map([[module.Link, [t37]]]));
    module.remove_tuples([t33]);
    module.remove_tuples([t32]);
    module.add_tuple_map(new Map([[module.Link, [t38]]]));
    module.remove_tuples([t37]);
    module.add_tuple_map(new Map([[module.Link, [t39]]]));
    module.add_tuple_map(new Map([[module.Link, [t40]]]));
    module.add_tuple_map(new Map([[module.Link, [t41]]]));
    module.add_tuple_map(new Map([[module.Link, [t42]]]));
    module.add_tuple_map(new Map([[module.Link, [t43]]]));
    module.remove_tuples([t26]);
    module.add_tuple_map(new Map([[module.Link, [t44]]]));
    module.add_tuple_map(new Map([[module.Link, [t45]]]));
    module.add_tuple_map(new Map([[module.Link, [t46]]]));
    module.add_tuple_map(new Map([[module.Link, [t47]]]));
    module.add_tuple_map(new Map([[module.Link, [t48]]]));
    module.add_tuple_map(new Map([[module.Link, [t49]]]));
    module.remove_tuples([t40]);
    module.add_tuple_map(new Map([[module.Link, [t50]]]));
    module.add_tuple_map(new Map([[module.Link, [t51]]]));
    module.remove_tuples([t39]);
    module.add_tuple_map(new Map([[module.Link, [t52]]]));
    module.add_tuple_map(new Map([[module.Link, [t53]]]));
    module.remove_tuples([t48]);
    module.add_tuple_map(new Map([[module.Link, [t54]]]));
    module.remove_tuples([t53]);
    module.add_tuple_map(new Map([[module.Link, [t55]]]));
    module.remove_tuples([t55]);
    module.add_tuple_map(new Map([[module.Link, [t56]]]));
    module.add_tuple_map(new Map([[module.Link, [t57]]]));
    module.remove_tuples([t35]);
    module.remove_tuples([t49]);
    module.add_tuple_map(new Map([[module.Link, [t58]]]));
    module.add_tuple_map(new Map([[module.Link, [t59]]]));
    module.add_tuple_map(new Map([[module.Link, [t60]]]));
    module.remove_tuples([t38]);
    module.add_tuple_map(new Map([[module.Link, [t61]]]));
    module.remove_tuples([t51]);
    module.add_tuple_map(new Map([[module.Link, [t62]]]));
    module.add_tuple_map(new Map([[module.Link, [t63]]]));
    module.remove_tuples([t1]);
    module.remove_tuples([t41]);
    module.add_tuple_map(new Map([[module.Link, [t64]]]));
    module.add_tuple_map(new Map([[module.Link, [t65]]]));
    module.remove_tuples([t65]);
    module.remove_tuples([t34]);
    module.remove_tuples([t43]);
    module.add_tuple_map(new Map([[module.Link, [t66]]]));
    module.add_tuple_map(new Map([[module.Link, [t67]]]));
    module.add_tuple_map(new Map([[module.Link, [t68]]]));
    module.add_tuple_map(new Map([[module.Link, [t69]]]));
    module.add_tuple_map(new Map([[module.Link, [t70]]]));
    module.add_tuple_map(new Map([[module.Link, [t71]]]));
    module.remove_tuples([t56]);
    module.remove_tuples([t46]);
    module.remove_tuples([t58]);
    module.add_tuple_map(new Map([[module.Link, [t72]]]));
    module.remove_tuples([t54]);
    module.add_tuple_map(new Map([[module.Link, [t73]]]));
    module.add_tuple_map(new Map([[module.Link, [t74]]]));
    module.remove_tuples([t67]);
    module.add_tuple_map(new Map([[module.Link, [t75]]]));
    module.remove_tuples([t59]);
    module.remove_tuples([t72]);
    module.add_tuple_map(new Map([[module.Link, [t76]]]));
    module.remove_tuples([t75]);
    module.add_tuple_map(new Map([[module.Link, [t77]]]));
    module.add_tuple_map(new Map([[module.Link, [t78]]]));
    module.remove_tuples([t52]);
    module.remove_tuples([t68]);
    module.remove_tuples([t57]);
    module.remove_tuples([t78]);
    module.remove_tuples([t60]);
    module.add_tuple_map(new Map([[module.Link, [t79]]]));
    module.add_tuple_map(new Map([[module.Link, [t80]]]));
    module.remove_tuples([t80]);
    module.remove_tuples([t77]);
    module.remove_tuples([t76]);
    module.remove_tuples([t71]);
    module.add_tuple_map(new Map([[module.Link, [t81]]]));
    module.add_tuple_map(new Map([[module.Link, [t82]]]));
    module.add_tuple_map(new Map([[module.Link, [t83]]]));
    module.remove_tuples([t74]);
    module.add_tuple_map(new Map([[module.Link, [t84]]]));
    module.remove_tuples([t18]);
    module.remove_tuples([t70]);
    module.add_tuple_map(new Map([[module.Link, [t85]]]));
    module.remove_tuples([t66]);
    module.remove_tuples([t79]);
    module.remove_tuples([t44]);
    module.remove_tuples([t61]);
    module.remove_tuples([t45]);
    module.add_tuple_map(new Map([[module.Link, [t86]]]));
    module.add_tuple_map(new Map([[module.Link, [t87]]]));
    module.add_tuple_map(new Map([[module.Link, [t88]]]));
    module.add_tuple_map(new Map([[module.Link, [t89]]]));
    module.add_tuple_map(new Map([[module.Link, [t90]]]));
    module.remove_tuples([t47]);
    module.add_tuple_map(new Map([[module.Link, [t91]]]));
    module.add_tuple_map(new Map([[module.Link, [t92]]]));
    module.remove_tuples([t84]);
    module.remove_tuples([t62]);
    module.add_tuple_map(new Map([[module.Link, [t93]]]));
    module.add_tuple_map(new Map([[module.Link, [t94]]]));
    module.add_tuple_map(new Map([[module.Link, [t95]]]));
    module.remove_tuples([t64]);
    module.add_tuple_map(new Map([[module.Link, [t96]]]));
    module.add_tuple_map(new Map([[module.Link, [t97]]]));
    module.add_tuple_map(new Map([[module.Link, [t98]]]));
    module.add_tuple_map(new Map([[module.Link, [t99]]]));
    module.remove_tuples([t99]);
    module.remove_tuples([t98]);
    module.remove_tuples([t97]);
    module.remove_tuples([t96]);
    module.remove_tuples([t95]);
    module.remove_tuples([t94]);
    module.remove_tuples([t93]);
    module.remove_tuples([t92]);
    module.remove_tuples([t91]);
    module.remove_tuples([t90]);
    module.remove_tuples([t89]);
    module.remove_tuples([t88]);
    module.remove_tuples([t87]);
    module.remove_tuples([t86]);
    module.remove_tuples([t85]);
    module.remove_tuples([t83]);
    module.remove_tuples([t82]);
    module.remove_tuples([t81]);
    module.remove_tuples([t73]);
    module.remove_tuples([t69]);
    module.remove_tuples([t63]);
    module.remove_tuples([t50]);
    module.remove_tuples([t42]);
    module.remove_tuples([t36]);
    module.remove_tuples([t29]);
    module.remove_tuples([t28]);
    module.remove_tuples([t23]);
  }
}
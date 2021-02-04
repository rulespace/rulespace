const link = (x,y) => ['Link', x, y];
export const wl = {
  name: 'lnrunegaddrem',
  src:
    `
    (define [Reachable x y]
      [Link x y])
      
    (define [Reachable x y]
      [Link x z] [Reachable z y])
    
    (define [Node x]
      [Link x _])
      
    (define [Node y]
      [Link _ y])
    
    (define [Unreachable x y]
      [Node x] [Node y] (not [Reachable x y]))
    
    `,
  wlCb(addTuples, removeTuples)
  {
    addTuples(link('a', 'b'));
    addTuples(link('b', 'c'));
    addTuples(link('c', 'c'));
    addTuples(link('c', 'd'));
    addTuples(link('d', 'e'));
    addTuples(link('e', 'f'));
    removeTuples(link('e', 'f'));
    addTuples(link('f', 'g'));
    addTuples(link('g', 'h'));
    addTuples(link('h', 'i'));
    addTuples(link('m', 'n'));
    addTuples(link('l', 'm'));
    removeTuples(link('f', 'g'));
    removeTuples(link('b', 'c'));
    addTuples(link('k', 'l'));
    addTuples(link('j', 'k'));
    addTuples(link('k', 'k'));
    addTuples(link('i', 'j'));
    addTuples(link('o', 'p'));
    removeTuples(link('h', 'i'));
    addTuples(link('q', 'r'));
    addTuples(link('p', 'q'));
    removeTuples(link('j', 'k'));
    removeTuples(link('k', 'l'));
    addTuples(link('s', 'u'));
    addTuples(link('s', 't'));
    addTuples(link('t', 'u'));
    removeTuples(link('a', 'b'));
    addTuples(link('v', 'w'));
    removeTuples(link('p', 'q'));
    removeTuples(link('o', 'p'));
    addTuples(link('v', 'x'));
    removeTuples(link('k', 'k'));
    removeTuples(link('s', 'u'));
    removeTuples(link('m', 'n'));
    removeTuples(link('l', 'm'));
    addTuples(link('w', 'x'));
    removeTuples(link('c', 'd'));
    addTuples(link('y', 'y'));
    removeTuples(link('s', 't'));
    removeTuples(link('g', 'h'));
    addTuples(link('y', 'x'));
    removeTuples(link('i', 'j'));
    addTuples(link('y', 'z'));
    removeTuples(link('c', 'c'));
    removeTuples(link('t', 'u'));
    addTuples(link('z', 'a'));
    removeTuples(link('q', 'r'));
    removeTuples(link('d', 'e'));
    removeTuples(link('v', 'w'));
    removeTuples(link('v', 'x'));
    removeTuples(link('w', 'x'));
    removeTuples(link('y', 'y'));
    removeTuples(link('y', 'x'));
    removeTuples(link('y', 'z'));
    removeTuples(link('z', 'a'));    
  }
}
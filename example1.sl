(define [Reachable x y]
  [Link x y])
  
(define [Reachable x y]
  [Reachable x z] [Link z y])

(define [Reachable X Y]
  [Link X Y])
  
(define [Reachable X Y]
  [Link X Z] [Reachable Z Y])

(define [Node X]
  [Link X _])
  
(define [Node Y]
  [Link _ Y])

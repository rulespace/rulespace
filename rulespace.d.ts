export interface Rulespace
{
  computeDelta(addTuples:any, remTuples:any): Delta;
}

export interface Delta
{
  added():any;
  removed():any;  
}
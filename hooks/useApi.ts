"use client"; export function useApi(){ return { data: null, loading: false, error: null, execute: async (fn: any)=> fn(), reset: ()=>{} }; }

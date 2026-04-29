// src/store/editorStore.js

import { create } from 'zustand'

const useEditorStore = create((set) => ({
  originalCode: '',
  uplCode: '',
  ast: null,
  currentLanguage: 'javascript',
  currentPack: 'english',

  setOriginalCode: (code) =>
    set({
      originalCode: code
    }),

  setUPLCode: (code) =>
    set({
      uplCode: code
    }),

  setAST: (ast) =>
    set({
      ast
    }),

  setCurrentLanguage: (language) =>
    set({
      currentLanguage: language
    }),

  setCurrentPack: (pack) =>
    set({
      currentPack: pack
    })
}))

export default useEditorStore
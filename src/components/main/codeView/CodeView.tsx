import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import * as monaco from 'monaco-editor';
import {
  useDispatch,
  useSelector,
} from 'react-redux';

import {
  CodeViewSyncDelay,
  DefaultTabSize,
  LogAllow,
} from '@_constants/main';
import { THtmlNodeData } from '@_node/index';
import {
  fnSelector,
  getActionGroupIndexSelector,
  globalSelector,
  hmsInfoSelector,
  MainContext,
  navigatorSelector,
  setCurrentFileContent,
} from '@_redux/main';
import Editor, {
  loader,
  Monaco,
} from '@monaco-editor/react';

import { CodeViewProps } from './types';

loader.config({ monaco })

export default function CodeView(props: CodeViewProps) {
  const dispatch = useDispatch()

  // main context
  const {
    // groupping action
    addRunningActions, removeRunningActions,

    // file tree view
    ffHoveredItem, setFFHoveredItem, ffHandlers, ffTree, setFFTree, updateFF,

    // ndoe tree view
    fnHoveredItem, setFNHoveredItem, nodeTree, setNodeTree, validNodeTree, setValidNodeTree,

    // update opt
    updateOpt, setUpdateOpt,

    // ff hms
    isHms, setIsHms, ffAction, setFFAction,

    // cmdk
    currentCommand, setCurrentCommand, cmdkOpen, setCmdkOpen, cmdkPages, setCmdkPages, cmdkPage,

    // global
    pending, setPending, messages, addMessage, removeMessage,

    // reference
    htmlReferenceData, cmdkReferenceData, cmdkReferenceJumpstart, cmdkReferenceActions, cmdkReferenceAdd,

    // active panel/clipboard
    activePanel, setActivePanel, clipboardData, setClipboardData,

    // os
    osType,

    // code view
    tabSize, setTabSize,
  } = useContext(MainContext)

  // redux state
  const actionGroupIndex = useSelector(getActionGroupIndexSelector)
  const { workspace, project, file, changedFiles } = useSelector(navigatorSelector)
  const { fileAction } = useSelector(globalSelector)
  const { futureLength, pastLength } = useSelector(hmsInfoSelector)
  // const { focusedItem, expandedItems, expandedItemsObj, selectedItems, selectedItemsObj } = useSelector(ffSelector)
  const { focusedItem, expandedItems, expandedItemsObj, selectedItems, selectedItemsObj } = useSelector(fnSelector)

  // -------------------------------------------------------------- Sync --------------------------------------------------------------
  // focusedItem - code select
  useEffect(() => {
    // validate
    if (monacoRef.current === null) return

    let node = validNodeTree[focusedItem]
    if (node === undefined) return

    // select and reveal the node's code sector
    const { startLineNumber, startColumn, endLineNumber, endColumn } = node.data as THtmlNodeData

    const editor = monacoRef.current as monaco.editor.IEditor
    editor.setSelection({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    })
    editor.revealRangeInCenter({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    }, 1/* scrollType - smooth */)
  }, [focusedItem])

  /* 
  // sync nodeTreeView&StageView based on editor's cursor pos
  const cursorPos = monacoRef.current === null ? null : monacoRef.current.getPosition()
  const cursorPosRef = useRef<monaco.Position>(cursorPos)
  useEffect(() => {
    // validate
    if (cursorPos === null || (cursorPosRef.current?.lineNumber === cursorPos.lineNumber && cursorPosRef.current.column === cursorPos.column)) return
    if (currentFile.uid === '') return
    if (reduxTimeout.current !== null) return

    let _uid: TNodeUid = ''

    let uids: TNodeUid[] = Object.keys(validNodeTree)
    uids = sortNodeUidsByBfs(uids)
    uids.reverse()
    for (const uid of uids) {
      const node = validNodeTree[uid]
      const { startLineNumber, startColumn, endLineNumber, endColumn } = node.data
      if (startLineNumber === endLineNumber) {
        if (cursorPos.lineNumber === startLineNumber && (startColumn < cursorPos.column && cursorPos.column <= endColumn)) {
          _uid = uid
          break
        }
      } else {
        if ((startLineNumber < cursorPos.lineNumber && cursorPos.lineNumber < endLineNumber) ||
          (startLineNumber === cursorPos.lineNumber && startColumn < cursorPos.column) ||
          (cursorPos.lineNumber === endLineNumber && cursorPos.column <= endColumn)) {
          _uid = uid
          break
        }
      }
    }

    if (_uid === '') return

    let node = validNodeTree[_uid]
    while (!node.data.valid) {
      node = validNodeTree[node.parentUid as TNodeUid]
    }

    _uid = node.uid
    if (focusedItemRef.current === _uid) return
    focusedItemRef.current = _uid

    // update redux
    addRunningAction(['cursorChange'])
    dispatch(Main.focusFNNode(_uid))
    dispatch(Main.selectFNNode([_uid]))
    removeRunningAction(['cursorChange'])
  }, [cursorPos])
  */

  // content - code
  useEffect(() => {
    // skil its own state change
    if (updateOpt.from === 'code') return

    codeContent.current = file.content
  }, [file.content])

  // code -> content
  const codeContent = useRef<string>(file.content)
  const reduxTimeout = useRef<NodeJS.Timeout | null>(null)
  const saveFileContentToRedux = useCallback(() => {
    // skip the same content
    if (file.content === codeContent.current) return

    LogAllow && console.log('codeView-content')

    setUpdateOpt({ parse: true, from: 'code' })

    addRunningActions(['processor-content', 'processor-validNodeTree'])

    setTimeout(() => dispatch(setCurrentFileContent(codeContent.current)), 0)

    reduxTimeout.current = null
  }, [file.content])
  const handleEditorChange = useCallback((value: string | undefined, ev: monaco.editor.IModelContentChangedEvent) => {
    if (file.uid === '') return

    codeContent.current = value || ''

    // update redux with debounce
    reduxTimeout.current !== null && clearTimeout(reduxTimeout.current)
    reduxTimeout.current = setTimeout(saveFileContentToRedux, CodeViewSyncDelay)
  }, [file.uid, saveFileContentToRedux])
  // -------------------------------------------------------------- Sync --------------------------------------------------------------

  // monaco-editor instance
  const monacoRef = useRef<monaco.editor.IEditor | null>(null)
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    // here is another way to get monaco instance
    // you can also store it in `useRef` for further usage
    monacoRef.current = editor
  }

  // monaco-editor options
  const [_tabSize, _setTabSize] = useState<number>(DefaultTabSize)
  useEffect(() => {
    setTabSize(_tabSize)
  }, [_tabSize])

  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const toogleWrap = () => setWordWrap(wordWrap === 'on' ? 'off' : 'on')

  const [language, setLanguage] = useState('html')

  // -------------------------------------------------------------- Cmdk --------------------------------------------------------------
  // panel focus handler
  const onPanelClick = useCallback((e: React.MouseEvent) => {
    setActivePanel('code')
  }, [])
  // -------------------------------------------------------------- Cmdk --------------------------------------------------------------

  return <>
    <div
      className='box'
      onClick={onPanelClick}
    >
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={"html"}
        language={language}
        defaultValue={""}
        value={codeContent.current}
        theme="vs-dark"
        // line={line}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        options={{
          // enableBasicAutocompletion: true,
          // enableLiveAutocompletion: true,
          // enableSnippets: true,
          // showLineNumbers: true,
          tabSize: tabSize,
          wordWrap: wordWrap,
        }}
      />
    </div>
  </>
}
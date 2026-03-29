/**
 * IdeChat — Multi-turn AI chat for the IDE Intelligence Panel.
 * Context syncs reactively from ideResponse (the results bar query run).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { ChatEmptyState, MessageBubble } from './ChatMessageParts';

export function IdeChat(): React.ReactElement {
    const messages = useTestStore((s) => s.chatMessages);
    const loading = useTestStore((s) => s.chatLoading);
    const sampleData = useTestStore((s) => s.chatSampleData);
    const sampleLoading = useTestStore((s) => s.chatSampleLoading);
    const contextSpl = useTestStore((s) => s.chatContextSpl);
    const ideResponse = useTestStore((s) => s.ideResponse);
    const test = useTestStore(selectActiveTest);
    const sendMessage = useTestStore((s) => s.sendChatMessage);
    const syncContext = useTestStore((s) => s.syncChatContext);
    const executeAction = useTestStore((s) => s.executeChatAction);
    const clearChat = useTestStore((s) => s.clearChat);

    const spl = test?.query?.spl ?? '';

    // Sync chat context whenever ideResponse changes (user ran/re-ran a query)
    useEffect(() => {
        if (!ideResponse) return;
        // Only re-sync if the SPL changed since last sync
        if (contextSpl === spl) return;
        syncContext(ideResponse, spl);
    }, [ideResponse, spl, contextSpl, syncContext]);

    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        sendMessage(text);
    }, [input, loading, sendMessage]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend],
    );

    const handleSuggestion = useCallback(
        (text: string) => {
            if (loading) return;
            sendMessage(text);
        },
        [loading, sendMessage],
    );

    const hasContext = ideResponse !== null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                    {sampleLoading && (
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Sampling...
                        </span>
                    )}
                    {hasContext && !sampleLoading && ideResponse.status === 'success' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                            {ideResponse.resultCount} results
                        </span>
                    )}
                    {hasContext && ideResponse.status === 'error' && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                            query error
                        </span>
                    )}
                    {!sampleLoading && sampleData && sampleData.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                            {sampleData.length} sample events
                        </span>
                    )}
                    {!hasContext && (
                        <span className="text-slate-500">Run a query first for full context</span>
                    )}
                </div>
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={clearChat}
                        className="text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-2">
                {messages.length === 0 && !loading && (
                    <ChatEmptyState onSuggestion={handleSuggestion} />
                )}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onExecuteAction={executeAction}
                    />
                ))}
                {loading && (
                    <div className="flex items-center gap-2 py-2 text-[12px] text-slate-400">
                        <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Thinking...
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-2 border-t border-slate-700/60 shrink-0">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your query..."
                    rows={2}
                    className="flex-1 bg-navy-800 text-slate-200 text-[12px] px-2.5 py-1.5 rounded border border-slate-700 focus:border-blue-500 outline-none resize-none"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="self-end px-3 py-1.5 rounded text-[12px] font-medium bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

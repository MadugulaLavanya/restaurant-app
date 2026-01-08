import { useEffect, useRef } from 'react';

/**
 * Custom hook for WebSocket connection
 * @param {string} url - WebSocket URL
 * @param {Function} onMessage - Callback for when a message is received
 */
export const useWebSocket = (url, onMessage) => {
    const socketRef = useRef(null);
    const onMessageRef = useRef(onMessage);

    // Update the ref when onMessage changes
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!url) return;

        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            console.log(`Connecting to WebSocket: ${url}`);
            const socket = new WebSocket(url);

            socket.onopen = () => {
                if (isMounted) console.log('WebSocket Connected');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (isMounted && onMessageRef.current) {
                        onMessageRef.current(data);
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            socket.onclose = () => {
                if (isMounted) {
                    console.log('WebSocket Disconnected. Retrying in 3 seconds...');
                    setTimeout(() => {
                        if (isMounted) connect();
                    }, 3000);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                socket.close();
            };

            socketRef.current = socket;
        };

        connect();

        return () => {
            isMounted = false;
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [url]);

    return socketRef.current;
};

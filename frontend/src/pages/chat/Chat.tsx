import { useRef, useState, useEffect } from "react";
import { Stack } from "@fluentui/react";
import { BroomRegular, DismissRegular, SquareRegular, ShieldLockRegular, ErrorCircleRegular } from "@fluentui/react-icons";

import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import rehypeRaw from "rehype-raw";

import styles from "./Chat.module.css";
import Azure from "../../assets/Azure.svg";

import {
    ChatMessage,
    ConversationRequest,
    conversationApi,
    Citation,
    ToolMessageContent,
    ChatResponse,
    getUserInfo
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";

const Chat = () => {
    // const [baseData,setBasedata] = useState<Array>([])
    const baseData =  [
        {
            role: "system",
            content:
            "你是一个C++编程助教老师。\n会根据学生的需求，通过一系列引导性问题和提示来帮助他们自己找到答案。\n\n采用引导式教学方法，帮助学生自主思考和解决问题。\n我通过理解问题、引导思考、提供提示、鼓励实践和总结反思的步骤，帮助学生找到答案。\n\n当学生向我提出一个关于C++编程的问题时，我会首先鼓励他们描述问题的具体细节。如果还不会，我会向他们提出一些问题，我会提供一些提示和建议，以引导他们自己思考和找到解决方案。最后，几轮对话之后，才能提供示范代码答案\n\n",
        },
        {
            role: "user",
            content:
            "请完成以下C++编程题目：  \n&nbsp;  \n编写一个程序，接受用户输入一个正整数n，然后计算并输出n的阶乘。  \n&nbsp;  \n要求使用循环结构完成阶乘的计算。阶乘的定义如下：  \n&nbsp;  \nn! = n * (n-1) * (n-2) * ... * 3 * 2 * 1  \n&nbsp;  \n例如，输入5，输出120",
        },
        {
            role: "assistant",
            content:
            "哦，我知道你渴望找到答案!\n但是记住，我是来帮你学习如何自己解决，\n不能直接告诉你答案！\n下面让我们一起来看看这道题：\n\n你认为第一步应该是什么？",
        },
        {
            role: "user",
            content: "从用户那里获取一个负数n",
        },
        {
            role: "assistant",
            content:
            "哎呀!看起来有一个小错误！\n应该是正整数n，而不是负数\n\n第二步，再创建一个变量，用于存储阶乘的结果，初始化为1\n\n接下来你有什么想法？",
        },
        {
            role: "user",
            content: "使用一个循环来计算阶乘，并将结果存储在变量中，最后输出结果",
        },
        {
            role: "assistant",
            content:
            "干得好!\n你已经掌握了这道题的正确思路\n下面自己来完成它吧！",
        },
        {
            role: "user",
            content:
            '用c++编写一个程序，要求用户输入一个整数，并判断该整数是奇数还是偶数。如果是奇数，输出"你输入的是奇数"，如果是偶数，输出"你输入的是偶数"。',
        },
        {
            role: "assistant",
            content:
            "学习如何自己做出这道题很重要!\n我不会告诉你答案的！\n你认为第一步你需要做什么？",
        },
        {
            role: "user",
            content: "不知道，给我一点提示",
        },
        {
            role: "assistant",
            content:
            "好吧，我可以给你一点提示：\n首先，你需要从用户那里获得一个整数。\n然后下一步你该怎么办？\n",
        },
        {
            role: "user",
            content:
            '用if语句来判断该整数是否为偶数\n如果它是偶数，输出"你输入的是偶数"。\n否则，它就是奇数，输出"你输入的是奇数"。',
        },
        {
            role: "assistant",
            content: "没错，你太聪明了，下一步，你该怎么办呢？",
        },
    ];
    const lastQuestionRef = useRef<string>("");
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
    const [activeCitation, setActiveCitation] = useState<[content: string, id: string, title: string, filepath: string, url: string, metadata: string]>();
    const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false);
    const [answers, setAnswers] = useState<ChatMessage[]>([]);
    const abortFuncs = useRef([] as AbortController[]);
    const [showAuthMessage, setShowAuthMessage] = useState<boolean>(false);

    const getUserInfoList = async () => {
        const userInfoList = await getUserInfo();
        if (userInfoList.length === 0 && window.location.hostname !== "127.0.0.1") {
            setShowAuthMessage(false);
        }
        else {
            setShowAuthMessage(false);
        }
    }

    const makeApiRequest = async (question: string) => {
        console.log(question);
        lastQuestionRef.current = question;
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            role: "user",
            content: question
        };
        let datas = answers.filter((answer) => answer.role !== "error");
        baseData.concat(datas);
        const request: ConversationRequest = {
            messages: [...baseData, userMessage]
        };

        let result = {} as ChatResponse;
        try {
            const response = await conversationApi(request, abortController.signal);
            if (response?.body) {

                const reader = response.body.getReader();
                let runningText = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            runningText += obj;
                            result = JSON.parse(runningText);
                            setShowLoadingMessage(false);
                            setAnswers([...answers, userMessage, ...result.choices[0].messages]);
                            runningText = "";
                        }
                        catch { }
                    });
                }
                setAnswers([...answers, userMessage, ...result.choices[0].messages]);
            }

        } catch (e) {
            if (!abortController.signal.aborted) {
                console.error(result);
                let errorMessage = "出现错误。请再试一次。如果问题仍然存在，请与网站管理员联系。";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                setAnswers([...answers, userMessage, {
                    role: "error",
                    content: errorMessage
                }]);
            } else {
                setAnswers([...answers, userMessage]);
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
        }

        return abortController.abort();
    };
    (window as any).sendData = makeApiRequest;
    const clearChat = () => {
        lastQuestionRef.current = "";
        setActiveCitation(undefined);
        setAnswers([]);
    };

    const stopGenerating = () => {
        abortFuncs.current.forEach(a => a.abort());
        setShowLoadingMessage(false);
        setIsLoading(false);
    }

    useEffect(() => {
        getUserInfoList();
        if(window.location.search){
            let keywords = window.location.search.split('=')[1];
            makeApiRequest(decodeURIComponent(keywords));
        }
       
    }, []);

    useEffect(() => chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" }), [showLoadingMessage]);

    const onShowCitation = (citation: Citation) => {
        setActiveCitation([citation.content, citation.id, citation.title ?? "", citation.filepath ?? "", "", ""]);
        setIsCitationPanelOpen(true);
    };

    const parseCitationFromMessage = (message: ChatMessage) => {
        if (message.role === "tool") {
            try {
                const toolMessage = JSON.parse(message.content) as ToolMessageContent;
                return toolMessage.citations;
            }
            catch {
                return [];
            }
        }
        return [];
    }

    return (
        <div className={styles.container} role="main">
            {false ? (
                <Stack className={styles.chatEmptyState}>
                    <ShieldLockRegular className={styles.chatIcon} style={{ color: 'darkorange', height: "200px", width: "200px" }} />
                    <h1 className={styles.chatEmptyStateTitle}>Authentication Not Configured</h1>
                    <h2 className={styles.chatEmptyStateSubtitle}>
                        This app does not have authentication configured. Please add an identity provider by finding your app in the
                        <a href="https://portal.azure.com/" target="_blank"> Azure Portal </a>
                        and following
                        <a href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization" target="_blank"> these instructions</a>.
                    </h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: "20px" }}><strong>Authentication configuration takes a few minutes to apply. </strong></h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: "20px" }}><strong>If you deployed in the last 10 minutes, please wait and reload the page after 10 minutes.</strong></h2>
                </Stack>
            ) : (
                <Stack horizontal className={styles.chatRoot}>
                    <div className={styles.chatContainer}>
                        {!lastQuestionRef.current ? (
                            <Stack className={styles.chatEmptyState}>
                                <img
                                    src="https://file.magaoedu.com/21c046eaa00da875ee5e4742c755761c.jpg"
                                    className={styles.chatIcon}
                                    aria-hidden="true"
                                />
                                <h1 className={styles.chatEmptyStateTitle}>开始聊天</h1>
                                <h2 className={styles.chatEmptyStateSubtitle}>此聊天机器人已配置为回答您的问题</h2>
                            </Stack>
                        ) : (
                            <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? "40px" : "0px" }} role="log">
                                {answers.map((answer, index) => (
                                    <>
                                        {answer.role === "user" ? (
                                            <div className={styles.chatMessageUser} tabIndex={0}>
                                                <div className={styles.chatMessageUserMessage}>{answer.content}</div>
                                            </div>
                                        ) : (
                                            answer.role === "assistant" ? <div className={styles.chatMessageGpt}>
                                                <Answer
                                                    answer={{
                                                        answer: answer.content,
                                                        citations: parseCitationFromMessage(answers[index - 1]),
                                                    }}
                                                    onCitationClicked={c => onShowCitation(c)}
                                                />
                                            </div> : answer.role === "error" ? <div className={styles.chatMessageError}>
                                                <Stack horizontal className={styles.chatMessageErrorContent}>
                                                    <ErrorCircleRegular className={styles.errorIcon} style={{ color: "rgba(182, 52, 67, 1)" }} />
                                                    <span>错误</span>
                                                </Stack>
                                                <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                                            </div> : null
                                        )}
                                    </>
                                ))}
                                {showLoadingMessage && (
                                    <>
                                        <div className={styles.chatMessageUser}>
                                            <div className={styles.chatMessageUserMessage}>{lastQuestionRef.current}</div>
                                        </div>
                                        <div className={styles.chatMessageGpt}>
                                            <Answer
                                                answer={{
                                                    answer: "答案生成中...",
                                                    citations: []
                                                }}
                                                onCitationClicked={() => null}
                                            />
                                        </div>
                                    </>
                                )}
                                <div ref={chatMessageStreamEnd} />
                            </div>
                        )}

                        <Stack horizontal className={styles.chatInput}>
                            {isLoading && (
                                <Stack
                                    horizontal
                                    className={styles.stopGeneratingContainer}
                                    role="button"
                                    aria-label="Stop generating"
                                    tabIndex={0}
                                    onClick={stopGenerating}
                                    onKeyDown={e => e.key === "Enter" || e.key === " " ? stopGenerating() : null}
                                >
                                    <SquareRegular className={styles.stopGeneratingIcon} aria-hidden="true" />
                                    <span className={styles.stopGeneratingText} aria-hidden="true">Stop generating</span>
                                </Stack>
                            )}
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={clearChat}
                                onKeyDown={e => e.key === "Enter" || e.key === " " ? clearChat() : null}
                                aria-label="Clear session"
                            >
                                <BroomRegular
                                    className={styles.clearChatBroom}
                                    style={{
                                        background: isLoading || answers.length === 0 ? "#BDBDBD" : "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)",
                                        cursor: isLoading || answers.length === 0 ? "" : "pointer"
                                    }}
                                    aria-hidden="true"
                                />
                            </div>
                            <QuestionInput
                                clearOnSend
                                placeholder="输入问题..."
                                disabled={isLoading}
                                id="iframe-box"
                                onSend={question => makeApiRequest(question)}
                            />
                        </Stack>
                    </div>
                    {answers.length > 0 && isCitationPanelOpen && activeCitation && (
                        <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
                            <Stack horizontal className={styles.citationPanelHeaderContainer} horizontalAlign="space-between" verticalAlign="center">
                                <span className={styles.citationPanelHeader}>Citations</span>
                                <DismissRegular className={styles.citationPanelDismiss} onClick={() => setIsCitationPanelOpen(false)} />
                            </Stack>
                            <h5 className={styles.citationPanelTitle} tabIndex={0}>{activeCitation[2]}</h5>
                            <div tabIndex={0}>
                                <ReactMarkdown
                                    linkTarget="_blank"
                                    className={styles.citationPanelContent}
                                    children={activeCitation[0]}
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                />
                            </div>

                        </Stack.Item>
                    )}
                </Stack>
            )}
        </div>
    );
};

export default Chat;

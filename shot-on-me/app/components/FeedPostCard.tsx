'use client'

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Heart, MessageCircle, Share2, MapPin, CheckCircle2, Clock } from 'lucide-react'
import StatusIndicator from './StatusIndicator'

interface FeedPostCardProps {
  post: any
  user: any
  isLiked: boolean
  onLike: (postId: string) => void
  onReaction: (postId: string, emoji: string) => void
  onComment: (postId: string, e: React.FormEvent) => void
  onShare: (post: any) => void
  onViewProfile?: (userId: string) => void
  getTimeAgo: (date: string) => string
  nearbyFriends: any[]
  expandedComments: Set<string>
  toggleCommentsExpanded: (postId: string) => void
  selectedPostId: string | null
  commentText: string
  setCommentText: (text: string) => void
  replyingTo: { postId: string; commentId: string; userName: string } | null
  setReplyingTo: (reply: { postId: string; commentId: string; userName: string } | null) => void
  showingReactionPicker: { postId: string; commentId: string } | null
  setShowingReactionPicker: (picker: { postId: string; commentId: string } | null) => void
  handleReply: (postId: string, commentId: string, userName: string) => void
  handleCommentReaction: (postId: string, commentId: string, emoji: string) => void
  getUserCommentReaction: (comment: any) => string | null
  getCommentReactionCounts: (comment: any) => { [emoji: string]: number }
}

// Optimized image component with progressive loading
const ProgressiveImage = memo(({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Use Intersection Observer for better lazy loading
    if (!imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Generate Cloudinary thumbnail URL (low quality placeholder)
            const thumbnailUrl = src.includes('cloudinary.com')
              ? src.replace('/upload/', '/upload/w_50,q_auto:low,f_auto/')
              : src

            // Load thumbnail first
            const tempImg = new Image()
            tempImg.onload = () => {
              setImageSrc(thumbnailUrl)
              // Then load full quality
              const fullImg = new Image()
              fullImg.onload = () => {
                setImageSrc(src)
                setIsLoaded(true)
              }
              fullImg.onerror = () => setHasError(true)
              fullImg.src = src
            }
            tempImg.onerror = () => {
              // Fallback to original if thumbnail fails
              setImageSrc(src)
            }
            tempImg.src = thumbnailUrl

            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px' } // Start loading 50px before entering viewport
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current)
      }
    }
  }, [src])

  if (hasError) {
    return (
      <div className={`${className} bg-primary-500/10 flex items-center justify-center`}>
        <span className="text-primary-500/50 text-sm">Image not available</span>
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-50 blur-sm'
          }`}
          onError={() => setHasError(true)}
        />
      )}
      {!imageSrc && (
        <div className={`${className} bg-primary-500/10 animate-pulse`} />
      )}
    </div>
  )
})

ProgressiveImage.displayName = 'ProgressiveImage'

// Optimized video component with thumbnail
const OptimizedVideo = memo(({ src, thumbnail, className }: { src: string; thumbnail?: string; className: string }) => {
  const [isInView, setIsInView] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '100px' }
    )

    observer.observe(containerRef.current)

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  // Generate thumbnail URL from Cloudinary if not provided
  const thumbnailUrl = thumbnail || (src.includes('cloudinary.com')
    ? src.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto:low,f_auto/')
    : null)

  return (
    <div ref={containerRef} className={className}>
      {!isInView && thumbnailUrl ? (
        <div className="relative w-full">
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full rounded-lg object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ) : isInView ? (
        <video
          ref={videoRef}
          src={src}
          controls={showControls}
          className="w-full rounded-lg"
          preload="metadata"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onError={() => {
            if (videoRef.current) {
              videoRef.current.style.display = 'none'
            }
          }}
        />
      ) : (
        <div className="w-full h-48 bg-primary-500/10 rounded-lg animate-pulse" />
      )}
    </div>
  )
})

OptimizedVideo.displayName = 'OptimizedVideo'

const FeedPostCard = memo(({
  post,
  user,
  isLiked,
  onLike,
  onReaction,
  onComment,
  onShare,
  onViewProfile,
  getTimeAgo,
  nearbyFriends,
  expandedComments,
  toggleCommentsExpanded,
  selectedPostId,
  commentText,
  setCommentText,
  replyingTo,
  setReplyingTo,
  showingReactionPicker,
  setShowingReactionPicker,
  handleReply,
  handleCommentReaction,
  getUserCommentReaction,
  getCommentReactionCounts
}: FeedPostCardProps) => {
  const authorId = post.author._id || post.author.id
  const isFriend = (user as any)?.friends?.includes(authorId) || authorId === user?.id
  const isExpanded = expandedComments.has(post._id)
  const topLevelComments = post.comments?.filter((c: any) => !c.replyTo) || []

  return (
    <div className="bg-gradient-to-b from-black via-black to-black/80 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 transition-all shadow-lg">
      {/* Author Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary-500/70 transition-all"
            onClick={() => {
              if (authorId && authorId !== user?.id && authorId !== (user as any)?._id) {
                onViewProfile?.(authorId)
              }
            }}
          >
            {post.author.profilePicture ? (
              <ProgressiveImage
                src={post.author.profilePicture}
                alt={post.author.firstName}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                <span className="text-primary-500 font-semibold">
                  {post.author.firstName[0]}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p
                className="font-semibold text-primary-500 tracking-tight cursor-pointer hover:text-primary-400 transition-all"
                onClick={() => {
                  if (authorId && authorId !== user?.id && authorId !== (user as any)?._id) {
                    onViewProfile?.(authorId)
                  }
                }}
              >
                {post.author.firstName} {post.author.lastName}
              </p>
              {isFriend && (post.author._id || post.author.id) && (
                <StatusIndicator
                  userId={(post.author._id || post.author.id) as string}
                  size="sm"
                />
              )}
              {isFriend && (
                <span className="text-xs bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2 py-0.5 rounded-full font-medium">
                  Friend
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-primary-400/70 font-light mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{getTimeAgo(post.createdAt)}</span>
              {post.checkIn?.venue && (
                <>
                  <span>•</span>
                  <span className="flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Checked in
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Venue/Location Badge */}
      {(post.checkIn?.venue || post.location?.venue) && (
        <div className="mb-3 flex items-center space-x-2 bg-primary-500/5 border border-primary-500/15 rounded-lg p-2.5">
          <MapPin className="w-3.5 h-3.5 text-primary-500" />
          <span className="text-primary-500 font-medium text-sm tracking-tight">
            {post.checkIn?.venue?.name || post.location?.venue?.name}
          </span>
          {nearbyFriends.some(f => f.firstName === post.author.firstName) && (
            <span className="ml-auto text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded font-medium">
              Friend nearby
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p className="text-primary-400/90 mb-3 leading-relaxed font-light">{post.content}</p>
      )}

      {/* Media - Optimized */}
      {post.media && post.media.length > 0 && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {post.media.map((media: any, idx: number) => (
            <div key={idx} className="mb-2">
              {media.type === 'image' && (
                <ProgressiveImage
                  src={media.url}
                  alt="Post media"
                  className="w-full rounded-lg max-h-96"
                />
              )}
              {media.type === 'video' && (
                <OptimizedVideo
                  src={media.url}
                  thumbnail={media.thumbnail}
                  className="w-full rounded-lg max-h-96"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reactions Display */}
      {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
        <div className="flex items-center gap-2 pt-2 pb-1 flex-wrap">
          {Object.entries(post.reactionCounts).map(([emoji, data]: [string, any]) => {
            const userHasReacted = post.userReactions?.includes(emoji) || post.userReaction === emoji
            return (
              <button
                key={emoji}
                onClick={() => onReaction(post._id, emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${
                  userHasReacted
                    ? 'bg-primary-500/20 border border-primary-500/50'
                    : 'bg-primary-500/5 border border-primary-500/10 hover:bg-primary-500/10'
                }`}
                title={`${data.count} ${emoji}`}
              >
                <span>{emoji}</span>
                <span className="text-xs">{data.count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-primary-500/10 mt-2">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onLike(post._id)}
            className={`flex items-center space-x-2 transition-colors ${
              isLiked ? 'text-red-500' : 'text-primary-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm">{post.likes?.length || 0}</span>
          </button>
          <button
            onClick={() => toggleCommentsExpanded(post._id)}
            className="flex items-center space-x-2 text-primary-400 hover:text-primary-500 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments?.length || 0}</span>
          </button>
          <button
            onClick={() => onShare(post)}
            className="flex items-center space-x-2 text-primary-400 hover:text-primary-500 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comments Section - Only render when expanded */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-primary-500/10">
          {/* Comments list - simplified for now, full implementation in FeedTab */}
          <div className="space-y-3 mb-3">
            {topLevelComments.slice(0, isExpanded ? undefined : 2).map((comment: any) => (
              <div key={comment._id} className="flex items-start space-x-2">
                <div className="w-8 h-8 border border-primary-500/50 rounded-full overflow-hidden flex-shrink-0">
                  {comment.user.profilePicture ? (
                    <ProgressiveImage
                      src={comment.user.profilePicture}
                      alt={comment.user.firstName}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-primary-500 text-xs font-bold">
                        {comment.user.firstName[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold text-primary-500">{comment.user.firstName}</span>
                    <span className="text-primary-300 ml-2">{comment.content}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-primary-400/70">{getTimeAgo(comment.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          {selectedPostId === post._id && (
            <form onSubmit={(e) => onComment(post._id, e)} className="flex items-center space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : 'Add a comment...'}
                className="flex-1 bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2 text-primary-400 text-sm focus:outline-none focus:border-primary-500/50"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
})

FeedPostCard.displayName = 'FeedPostCard'

export default FeedPostCard


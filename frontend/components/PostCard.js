import { useState } from "react";
import Link from "next/link";
import api from "../utils/api";

const PostCard = ({ post, onLikeUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/posts/${post.id}/like`);
      onLikeUpdate(post.id, response.data.liked);
    } catch (error) {
      console.error("Failed to like post:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
          {post.username?.charAt(0).toUpperCase()}
        </div>
        <div className="ml-3">
          <Link
            href={`/profile/${post.user_id}`}
            className="font-medium text-gray-900 hover:text-blue-600"
          >
            {post.username}
          </Link>
          <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        {post.image && (
          <div className="mt-3">
            <img
              src={post.image}
              alt="Post image"
              className="max-w-full h-auto rounded-lg"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={handleLike}
          disabled={loading}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            post.is_liked
              ? "text-red-600 bg-red-50 hover:bg-red-100"
              : "text-gray-600 hover:bg-gray-100"
          } disabled:opacity-50`}
        >
          <svg
            className="w-5 h-5"
            fill={post.is_liked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>
            {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
          </span>
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-red-600 hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default PostCard;

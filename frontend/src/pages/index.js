import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../utils/auth";
import PostForm from "../../components/PostForm";
import PostCard from "../../components/PostCard";
import api from "../../utils/api";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      fetchPosts();
    }
  }, [user, isAuthenticated]);

  const fetchPosts = async (pageNum = 1, reset = true) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await api.get(`/posts?page=${pageNum}&limit=10`);
      const { posts: newPosts, pagination } = response.data;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(pagination.hasNext);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLikeUpdate = (postId, liked) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: liked,
            like_count: liked
              ? parseInt(post.like_count) + 1
              : parseInt(post.like_count) - 1,
          };
        }
        return post;
      })
    );
  };

  const loadMorePosts = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Home</h1>

      <PostForm onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading posts...</p>
        </div>
      ) : (
        <>
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No posts yet. Create the first one!
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeUpdate={handleLikeUpdate}
                />
              ))}

              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMorePosts}
                    disabled={loadingMore}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

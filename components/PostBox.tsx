import React from "react";
import { useSession } from "next-auth/react";
import Avatar from "./Avatar";
import { LinkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ADD_POST, ADD_SUBREDDIT } from "../graphql/mutations";
import { useMutation } from "@apollo/client"
import client from '../apollo-client'
import { GET_SUBREDDIT_BY_TOPIC, GET_ALL_POSTS } from "../graphql/queries";
import toast from 'react-hot-toast'

type FormData = {
  postTitle: string;
  postBody: string;
  postImage: string;
  subreddit: string;
};

type Props = {
  subreddit?: String
}

function PostBox({subreddit}: Props) {
  const { data: session } = useSession();
  const [addPost] = useMutation(ADD_POST, {
    refetchQueries: [GET_ALL_POSTS,'getPostList'],
  });
  const [addSubreddit] = useMutation(ADD_SUBREDDIT)

  const [imageBoxOpen, setImageBoxOpen] = useState<boolean>(false);
  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = handleSubmit(async (formData) => {
    console.log(formData);
    const notification = toast.loading('Creating new post...');

    try {
        // Query for the subreddit topic...
        const { 
          data: { getSubredditListByTopic },
        } = await client.query({
            query: GET_SUBREDDIT_BY_TOPIC,
            variables: {
                topic: subreddit || formData.subreddit 
            }
        })

        const subredditExists = getSubredditListByTopic.length > 0;

        if(!subredditExists) {
            // create subreddit....
            console.log('Subreddit is new! => creating a new Subreddit :)')
            console.log(formData.subreddit)
            const { data: { insertSubreddit: newSubreddit } } = await addSubreddit({
                variables: {
                    topic: formData.subreddit
                } 
            })
            console.log('Creating post...', newSubreddit)
            const image = formData.postImage || ""

            const {data: { insertPost: newPost} } = await addPost({
                variables: {
                    body: formData.postBody,
                    image: image,
                    subreddit_id: newSubreddit.id,
                    title: formData.postTitle,
                    username: session?.user?.name,
                }
            })
            console.log('New post added: ', newPost)
        } else {
            // use existing subreddit
            console.log('Using existing subreddit')
            console.log(getSubredditListByTopic)
            const image = formData.postImage || ''

            const {data: {insertPost: newPost}} = await addPost({
                variables: {
                    body: formData.postBody,
                    image: image,
                    subreddit_id: getSubredditListByTopic[0].id,
                    title: formData.postTitle,
                    username: session?.user?.name,
                }
            })
            console.log('New post added: ', newPost)
        }

        // after the post has been added
        setValue('postBody', '')
        setValue('postImage', '')
        setValue('postTitle', '')
        setValue('subreddit', '')

        toast.success('New post created', {
            id: notification
        })
    } catch (error) {
        console.error(error)
        toast.error('Sorry, something went wrong! :/', {
            id: notification
        })
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-16 z-50 bg-white border rounded-md border-gray-300 p-2"
    >
      <div className="flex items-center space-x-3">
        <Avatar />

        <input
          {...register("postTitle", { required: true })}
          disabled={!session}
          className="bg-gray-50 p-2 pl-5 outline-none rounded-md flex-1"
          placeholder={
            session? subreddit? `Create a post in r/${subreddit}` : 
            "Create a new post by entering a title!" : 
            "Sign in to post"
          }
        />

        <PhotoIcon
          onClick={() => setImageBoxOpen(!imageBoxOpen)}
          className={`h-6 text-gray-300 cursor-pointer ${
            imageBoxOpen && "text-blue-300"
          }`}
        />
        <LinkIcon className="h-6 text-gray-300" />
      </div>

      {!!watch("postTitle") && (
        <div className="flex flex-col py-2">
          {/* Body Box */}
          <div className="flex items-center px-2">
            <p className="min-w-[90px]">Body</p>
            <input
              className="m-2 flex-1 bg-blue-50 p-2 outline-none"
              {...register("postBody")}
              type="text"
              placeholder="text (Optional)"
            />
          </div>

          {!subreddit && (
              <div className="flex items-center px-2">
              <p className="min-w-[90px]">Subreddit</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register("subreddit", { required: true })}
                type="text"
                placeholder="i.e. reactjs"
              />
            </div>
          )}

          {imageBoxOpen && (
            <div className="flex items-center px-2">
              <p className="min-w-[90px]">Image URL:</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register("postImage")}
                type="text"
                placeholder="Optional..."
              />
            </div>
          )}

          {/* Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="space-y-2 p-2 text-red-500">
              {errors.postTitle?.type === "required" && (
                <p>A Post Title is required</p>
              )}

              {errors.subreddit?.type === "required" && (
                <p>A Subreddit is required</p>
              )}
            </div>
          )}

          {!!watch("postTitle") && (
            <button
              type="submit"
              className="w-full rounded-full bg-blue-400 p-2 text-white"
            >
              Create Post
            </button>
          )}
        </div>
      )}
    </form>
  );
}

export default PostBox;

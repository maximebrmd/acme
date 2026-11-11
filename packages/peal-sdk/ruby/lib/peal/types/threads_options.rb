# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Threads account. Scheduling needs none of them; `linkAttachment` is for a post without
    # media.
    class ThreadsOptions < Internal::Types::Model
      field :link_attachment, -> { String }, optional: true, nullable: false, api_name: "linkAttachment"

      field :reply_control, -> { Peal::Types::ThreadsReplyControl }, optional: true, nullable: false, api_name: "replyControl"

      field :topic_tag, -> { String }, optional: true, nullable: false, api_name: "topicTag"
    end
  end
end

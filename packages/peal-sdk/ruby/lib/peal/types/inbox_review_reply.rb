# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReviewReply < Internal::Types::Model
      field :author_id, -> { String }, optional: false, nullable: true, api_name: "authorId"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :reason, -> { Peal::Types::InboxReviewReplyReason }, optional: false, nullable: true

      field :review_id, -> { String }, optional: false, nullable: false, api_name: "reviewId"

      field :settled_at, -> { String }, optional: false, nullable: true, api_name: "settledAt"

      field :status, -> { Peal::Types::InboxReplyStatus }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false, api_name: "threadId"
    end
  end
end

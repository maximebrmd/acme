# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventCommentsReceived < Internal::Types::Model
      field :count, -> { Integer }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :thread_id, -> { String }, optional: false, nullable: false, api_name: "threadId"
    end
  end
end

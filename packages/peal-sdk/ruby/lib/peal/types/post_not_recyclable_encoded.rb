# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostNotRecyclableEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :reason, -> { Peal::Types::NotRecyclableReason }, optional: false, nullable: false
    end
  end
end

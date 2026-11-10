# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DuplicateOnChannel < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"
    end
  end
end

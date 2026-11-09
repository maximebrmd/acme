# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostPublished < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: true

      field :permalink, -> { String }, optional: false, nullable: true

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"
    end
  end
end

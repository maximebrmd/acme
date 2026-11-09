# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostUnconfirmed < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: true

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"
    end
  end
end

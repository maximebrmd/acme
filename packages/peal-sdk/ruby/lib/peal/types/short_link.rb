# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ShortLink < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :clicks, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :destination, -> { String }, optional: false, nullable: false

      field :disabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :part, -> { Integer }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :short_url, -> { String }, optional: false, nullable: true, api_name: "shortUrl"

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end

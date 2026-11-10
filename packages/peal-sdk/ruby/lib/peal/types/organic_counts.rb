# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class OrganicCounts < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :impressions, -> { Integer }, optional: false, nullable: true

      field :likes, -> { Integer }, optional: false, nullable: true

      field :read_at, -> { String }, optional: false, nullable: true, api_name: "readAt"

      field :replies, -> { Integer }, optional: false, nullable: true

      field :reposts, -> { Integer }, optional: false, nullable: true
    end
  end
end

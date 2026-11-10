# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelPreview < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :hashtags, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :links, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :media, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :mentions, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :parts, -> { Internal::Types::Array[Peal::Types::PartPreview] }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false

      field :text_counts, -> { Internal::Types::Array[Peal::Types::TextCount] }, optional: false, nullable: false, api_name: "textCounts"

      field :violations, -> { Internal::Types::Array[Peal::Types::ContentViolation] }, optional: false, nullable: false
    end
  end
end

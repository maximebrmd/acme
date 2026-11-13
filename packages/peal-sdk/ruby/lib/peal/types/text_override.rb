# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TextOverride < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :media, -> { Internal::Types::Array[Peal::Types::MediaAttachment] }, optional: true, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end

# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostDraft < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :channel_sets, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelSets"

      field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

      field :default_signatures, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "defaultSignatures"

      field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false

      field :signature_id, -> { String }, optional: true, nullable: false, api_name: "signatureId"

      field :tag_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "tagIds"
    end
  end
end

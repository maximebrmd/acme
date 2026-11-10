# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class PostToValidate < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :allow_duplicate, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "allowDuplicate"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

        field :channel_sets, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelSets"

        field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

        field :default_signatures, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "defaultSignatures"

        field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false

        field :signature_id, -> { String }, optional: true, nullable: false, api_name: "signatureId"

        field :when_, -> { Peal::Types::PostTiming }, optional: true, nullable: false, api_name: "when"
      end
    end
  end
end

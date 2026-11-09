# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Channel < Internal::Types::Model
      field :avatar_url, -> { String }, optional: false, nullable: true, api_name: "avatarUrl"

      field :connection, -> { Peal::Types::InstagramConnection }, optional: false, nullable: true

      field :display_name, -> { String }, optional: false, nullable: true, api_name: "displayName"

      field :handle, -> { String }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :status, -> { Peal::Types::ChannelStatus }, optional: false, nullable: false

      field :token_expires_at, -> { String }, optional: false, nullable: true, api_name: "tokenExpiresAt"
    end
  end
end

# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventChannelReconnectSoon < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"
    end
  end
end

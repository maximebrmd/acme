# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TikTokAccountPosting < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::TikTokAccountPostingReady }, key: "READY"

      member -> { Peal::Types::TikTokAccountPostingBlocked }, key: "BLOCKED"
    end
  end
end

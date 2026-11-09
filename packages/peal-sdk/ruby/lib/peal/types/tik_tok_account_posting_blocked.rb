# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TikTokAccountPostingBlocked < Internal::Types::Model
      field :reason, -> { Peal::Types::TikTokBlock }, optional: false, nullable: false
    end
  end
end

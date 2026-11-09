# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TikTokAccountPostingReady < Internal::Types::Model
      field :creator, -> { Peal::Types::TikTokCreator }, optional: false, nullable: false
    end
  end
end

# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostStepStep
      extend Peal::Internal::Types::Enum

      CREATE_CAMPAIGN = "createCampaign"
      CREATE_AD_SET = "createAdSet"
      CREATE_AD = "createAd"
      ACTIVATE_AD = "activateAd"
      ACTIVATE_AD_SET = "activateAdSet"
      ACTIVATE_CAMPAIGN = "activateCampaign"
      PAUSE = "pause"
      RESUME = "resume"
    end
  end
end
